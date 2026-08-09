using System.Data;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Core.Security;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

/// <summary>
/// Password login and server-side session lifecycle. A login revokes every existing
/// active session for the account before creating the new one.
/// </summary>
public class AuthService(AppDbContext db, IOptions<AuthSettings> authOptions) : IAuthService
{
    private readonly AuthSettings _settings = authOptions.Value;

    public async Task<AuthenticatedSession?> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return null;

        var username = request.Username.Trim();
        var account = await db.Accounts.AsNoTracking().FirstOrDefaultAsync(a => a.Username == username, ct);
        if (account is null || account.Status != 1)
            return null;

        bool passwordIsValid;
        try
        {
            passwordIsValid = BCrypt.Net.BCrypt.Verify(request.Password, account.Password);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            passwordIsValid = false;
        }

        if (!passwordIsValid) return null;

        var now = DateTimeOffset.UtcNow;
        var refreshToken = CreateRefreshToken();

        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

        // Lock the account row so concurrent logins are ordered deterministically.
        var lockedAccount = await db.Accounts
            .FromSqlInterpolated($"select * from account where id = {account.Id} for update")
            .SingleAsync(ct);

        await db.AuthSessions
            .Where(s => s.AccountId == lockedAccount.Id && s.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.RevokedAt, now), ct);

        var session = new AuthSession
        {
            Id = Guid.NewGuid(),
            AccountId = lockedAccount.Id,
            RefreshTokenHash = HashRefreshToken(refreshToken),
            CreatedAt = now,
            LastSeenAt = now,
            ExpiresAt = now.AddHours(_settings.SessionHours),
        };

        db.AuthSessions.Add(session);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return ToAuthenticatedSession(lockedAccount, session, refreshToken);
    }

    public async Task<AuthenticatedSession?> RefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken)) return null;

        var tokenHash = HashRefreshToken(refreshToken);
        var now = DateTimeOffset.UtcNow;

        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var session = await db.AuthSessions
            .FromSqlInterpolated($"select * from auth_session where refresh_token_hash = {tokenHash} and revoked_at is null for update")
            .Include(s => s.Account)
            .SingleOrDefaultAsync(ct);

        if (session is null) return null;

        if (session.ExpiresAt <= now || session.Account.Status != 1)
        {
            session.RevokedAt = now;
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return null;
        }

        // Rotation prevents a previously captured refresh token from being replayed.
        var nextRefreshToken = CreateRefreshToken();
        session.RefreshTokenHash = HashRefreshToken(nextRefreshToken);
        session.LastSeenAt = now;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return ToAuthenticatedSession(session.Account, session, nextRefreshToken);
    }

    public Task<bool> ValidateSessionAsync(Guid sessionId, long accountId, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        return db.AuthSessions.AsNoTracking().AnyAsync(
            s => s.Id == sessionId &&
                 s.AccountId == accountId &&
                 s.RevokedAt == null &&
                 s.ExpiresAt > now &&
                 s.Account.Status == 1,
            ct);
    }

    public async Task RevokeSessionAsync(Guid sessionId, long accountId, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        await db.AuthSessions
            .Where(s => s.Id == sessionId && s.AccountId == accountId && s.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.RevokedAt, now), ct);
    }

    private static AuthenticatedSession ToAuthenticatedSession(Account account, AuthSession session, string refreshToken) =>
        new(
            session.Id,
            account.Id,
            account.Username,
            account.RoleId,
            Roles.Name(account.RoleId),
            refreshToken,
            session.ExpiresAt);

    private static string CreateRefreshToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    private static string HashRefreshToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();
}
