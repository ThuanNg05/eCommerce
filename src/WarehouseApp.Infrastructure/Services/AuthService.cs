using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

/// <summary>Password-based login against the account store (BCrypt verification). Returns
/// null for any failure without revealing which of unknown-user / inactive / wrong-password
/// occurred.</summary>
public class AuthService(AppDbContext db) : IAuthService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest r, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(r.Username) || string.IsNullOrWhiteSpace(r.Password))
            return null;

        var username = r.Username.Trim();
        var account = await db.Accounts.AsNoTracking().FirstOrDefaultAsync(a => a.Username == username, ct);
        if (account is null || account.Status != 1)
            return null;

        bool ok;
        try
        {
            ok = BCrypt.Net.BCrypt.Verify(r.Password, account.Password);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            // Stored value isn't a BCrypt hash (e.g. a legacy/seed row) — treat as invalid
            // rather than throwing a 500.
            ok = false;
        }

        return ok ? new LoginResponse(account.Id, account.Username, account.RoleId, Roles.Name(account.RoleId)) : null;
    }
}
