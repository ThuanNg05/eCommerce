using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

public class CustomerService(AppDbContext db) : ICustomerService
{
    public async Task<PagedResult<CustomerDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = db.Customers.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(c => EF.Functions.ILike(c.Name, $"%{s}%") || EF.Functions.ILike(c.Phone, $"%{s}%"));
        }

        var total = await query.LongCountAsync(ct);
        var items = await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CustomerDto(
                c.Id, c.Name, c.Phone, c.Address, c.Email, c.GroupPrice, c.Description, c.UpdatedAt))
            .ToListAsync(ct);

        return new PagedResult<CustomerDto>(items, page, pageSize, total);
    }

    public async Task<CustomerDto?> GetAsync(long id, CancellationToken ct = default)
    {
        var c = await db.Customers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return c is null ? null : ToDto(c);
    }

    public async Task<CustomerDto> CreateAsync(CreateCustomerRequest r, CancellationToken ct = default)
    {
        var name = r.Name.Trim();
        var phone = r.Phone.Trim();
        var email = string.IsNullOrWhiteSpace(r.Email) ? null : r.Email.Trim();
        var group = Normalize(r.GroupPrice);

        await EnsureUniqueAsync(null, name, phone, email, ct);

        var c = new Customer
        {
            Name = name,
            Phone = phone,
            Address = r.Address,
            Email = email,
            GroupPrice = group,
            Description = r.Description
        };

        db.Customers.Add(c);
        await db.SaveChangesAsync(ct);
        return ToDto(c);
    }

    public async Task<CustomerDto?> UpdateAsync(long id, UpdateCustomerRequest r, CancellationToken ct = default)
    {
        var c = await db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c is null) return null;

        var name = r.Name.Trim();
        var phone = r.Phone.Trim();
        var email = string.IsNullOrWhiteSpace(r.Email) ? null : r.Email.Trim();

        await EnsureUniqueAsync(id, name, phone, email, ct);

        c.Name = name;
        c.Phone = phone;
        c.Address = r.Address;
        c.Email = email;
        c.GroupPrice = Normalize(r.GroupPrice);
        c.Description = r.Description;
        c.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return ToDto(c);
    }

    private async Task EnsureUniqueAsync(long? excludeId, string name, string phone, string? email, CancellationToken ct)
    {
        if (await db.Customers.AnyAsync(c => c.Id != excludeId && c.Name == name, ct))
            throw new DomainValidationException($"Khách hàng tên '{name}' đã tồn tại.");
        if (await db.Customers.AnyAsync(c => c.Id != excludeId && c.Phone == phone, ct))
            throw new DomainValidationException($"Số điện thoại '{phone}' đã được sử dụng.");
        if (email is not null && await db.Customers.AnyAsync(c => c.Id != excludeId && c.Email == email, ct))
            throw new DomainValidationException($"Email '{email}' đã được sử dụng.");
    }

    /// <summary>GroupPrice is a single-character tier code; keep at most one char or null.</summary>
    private static string? Normalize(string? groupPrice)
    {
        if (string.IsNullOrWhiteSpace(groupPrice)) return null;
        var g = groupPrice.Trim();
        return g.Length > 1 ? g[..1] : g;
    }

    private static CustomerDto ToDto(Customer c) =>
        new(c.Id, c.Name, c.Phone, c.Address, c.Email, c.GroupPrice, c.Description, c.UpdatedAt);
}
