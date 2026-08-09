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
    private static readonly string DummyPasswordHash =
        BCrypt.Net.BCrypt.HashPassword("warehouse-auth-dummy-password", workFactor: 10);

    public async Task<AuthenticatedSession?> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return null;

        var username = request.Username.Trim();
        var now = DateTimeOffset.UtcNow;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

        // Account-based locking keeps failed-attempt counters and one-device sessions correct
        // even when multiple machines submit credentials at the same time.
        var account = await db.Accounts
            .FromSqlInterpolated($"select * from account where username = {username} for update")
            .SingleOrDefaultAsync(ct);

        if (account is null)
        {
            TryVerify(request.Password, DummyPasswordHash);
            return null;
        }

        if (account.Status != 1 || account.LockedUntil > now)
        {
            TryVerify(request.Password, account.Password);
            return null;
        }

        if (!TryVerify(request.Password, account.Password))
        {
            account.FailedLoginAttempts++;
            if (account.FailedLoginAttempts >= _settings.MaxFailedLoginAttempts)
            {
                account.FailedLoginAttempts = 0;
                account.LockedUntil = now.AddMinutes(_settings.LockoutMinutes);
            }

            account.UpdatedAt = now;
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return null;
        }

        account.FailedLoginAttempts = 0;
        account.LockedUntil = null;
        account.UpdatedAt = now;
        var refreshToken = CreateRefreshToken();

        await db.AuthSessions
            .Where(s => s.AccountId == account.Id && s.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.RevokedAt, now), ct);

        var session = CreateSession(account.Id, refreshToken, now);
        db.AuthSessions.Add(session);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return ToAuthenticatedSession(account, session, refreshToken);
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

    public async Task<AuthenticatedSession> ChangePasswordAsync(
        Guid sessionId,
        long accountId,
        ChangePasswordRequest request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            throw new DomainValidationException("Mật khẩu hiện tại không đúng.");

        var now = DateTimeOffset.UtcNow;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var account = await db.Accounts
            .FromSqlInterpolated($"select * from account where id = {accountId} for update")
            .SingleOrDefaultAsync(ct)
            ?? throw new DomainValidationException("Phiên đăng nhập không còn hợp lệ.");

        var currentSessionIsActive = await db.AuthSessions.AnyAsync(
            s => s.Id == sessionId &&
                 s.AccountId == accountId &&
                 s.RevokedAt == null &&
                 s.ExpiresAt > now,
            ct);
        if (!currentSessionIsActive || account.Status != 1)
            throw new DomainValidationException("Phiên đăng nhập không còn hợp lệ.");

        if (!TryVerify(request.CurrentPassword, account.Password))
            throw new DomainValidationException("Mật khẩu hiện tại không đúng.");

        PasswordPolicy.EnsureValid(request.NewPassword, account.Username);
        if (TryVerify(request.NewPassword, account.Password))
            throw new DomainValidationException("Mật khẩu mới phải khác mật khẩu hiện tại.");

        account.Password = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 12);
        account.MustChangePassword = false;
        account.PasswordChangedAt = now;
        account.FailedLoginAttempts = 0;
        account.LockedUntil = null;
        account.UpdatedAt = now;

        await db.AuthSessions
            .Where(s => s.AccountId == accountId && s.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.RevokedAt, now), ct);

        var refreshToken = CreateRefreshToken();
        var nextSession = CreateSession(accountId, refreshToken, now);
        db.AuthSessions.Add(nextSession);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return ToAuthenticatedSession(account, nextSession, refreshToken);
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
            account.MustChangePassword,
            refreshToken,
            session.ExpiresAt);

    private AuthSession CreateSession(long accountId, string refreshToken, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        AccountId = accountId,
        RefreshTokenHash = HashRefreshToken(refreshToken),
        CreatedAt = now,
        LastSeenAt = now,
        ExpiresAt = now.AddHours(_settings.SessionHours),
    };

    private static bool TryVerify(string password, string hash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            return false;
        }
    }

    private static string CreateRefreshToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    private static string HashRefreshToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();
}
