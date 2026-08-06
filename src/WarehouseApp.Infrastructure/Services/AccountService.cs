using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

/// <summary>
/// Account management (FR001). Passwords are stored only as BCrypt hashes and never returned;
/// the hash is set on create and replaced on an explicit password reset. Accounts are
/// deactivated via <c>Status</c> rather than hard-deleted.
/// </summary>
public class AccountService(AppDbContext db) : IAccountService
{
    private const int MinPasswordLength = 6;

    public async Task<PagedResult<AccountDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = db.Accounts.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(a => EF.Functions.ILike(a.Username, $"%{s}%"));
        }

        var total = await query.LongCountAsync(ct);
        var accounts = await query
            .OrderBy(a => a.Username)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<AccountDto>(accounts.Select(ToDto).ToList(), page, pageSize, total);
    }

    public async Task<AccountDto?> GetAsync(long id, CancellationToken ct = default)
    {
        var a = await db.Accounts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return a is null ? null : ToDto(a);
    }

    public async Task<AccountDto> CreateAsync(CreateAccountRequest r, CancellationToken ct = default)
    {
        var username = r.Username?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(username))
            throw new DomainValidationException("Username is required.");
        if (string.IsNullOrEmpty(r.Password) || r.Password.Length < MinPasswordLength)
            throw new DomainValidationException($"Password must be at least {MinPasswordLength} characters.");
        if (!Roles.IsValid(r.RoleId))
            throw new DomainValidationException("Role must be 1 (Admin) or 2 (Staff).");
        if (await db.Accounts.AnyAsync(a => a.Username == username, ct))
            throw new DomainValidationException($"Username '{username}' is already taken.");

        var account = new Account
        {
            Username = username,
            Password = BCrypt.Net.BCrypt.HashPassword(r.Password),
            RoleId = r.RoleId,
            Status = 1,
        };
        db.Accounts.Add(account);
        await db.SaveChangesAsync(ct);
        return ToDto(account);
    }

    public async Task<AccountDto?> UpdateAsync(long id, UpdateAccountRequest r, CancellationToken ct = default)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (account is null) return null;

        if (!Roles.IsValid(r.RoleId))
            throw new DomainValidationException("Role must be 1 (Admin) or 2 (Staff).");

        account.RoleId = r.RoleId;
        account.Status = r.Status;
        if (!string.IsNullOrWhiteSpace(r.Password))
        {
            if (r.Password.Length < MinPasswordLength)
                throw new DomainValidationException($"Password must be at least {MinPasswordLength} characters.");
            account.Password = BCrypt.Net.BCrypt.HashPassword(r.Password);
        }
        account.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return ToDto(account);
    }

    private static AccountDto ToDto(Account a) =>
        new(a.Id, a.Username, a.RoleId, Roles.Name(a.RoleId), a.Status, a.CreatedAt, a.UpdatedAt);
}
