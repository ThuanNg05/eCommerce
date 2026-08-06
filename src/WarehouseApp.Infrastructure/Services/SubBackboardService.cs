using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

public class SubBackboardService(AppDbContext db) : ISubBackboardService
{
    public async Task<PagedResult<SubBackboardDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = db.SubBackboards.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(b => EF.Functions.ILike(b.Size, $"%{s}%"));
        }

        var total = await query.LongCountAsync(ct);
        var items = await query
            .OrderBy(b => b.Size)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new SubBackboardDto(
                b.Id, b.Size, b.InStock, b.WarningStock, b.Status, b.Description, b.UpdatedAt))
            .ToListAsync(ct);

        return new PagedResult<SubBackboardDto>(items, page, pageSize, total);
    }

    public async Task<SubBackboardDto?> GetAsync(long id, CancellationToken ct = default)
    {
        var b = await db.SubBackboards.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return b is null ? null : ToDto(b);
    }

    public async Task<SubBackboardDto> CreateAsync(CreateSubBackboardRequest r, CancellationToken ct = default)
    {
        var size = r.Size.Trim();
        if (await db.SubBackboards.AnyAsync(b => b.Size == size, ct))
            throw new DomainValidationException($"A sub-backboard with size '{size}' already exists.");

        var b = new SubBackboard
        {
            Size = size,
            InStock = r.InStock,
            WarningStock = r.WarningStock,
            Description = r.Description,
            Status = 1
        };
        db.SubBackboards.Add(b);
        await db.SaveChangesAsync(ct);
        return ToDto(b);
    }

    public async Task<SubBackboardDto?> UpdateAsync(long id, UpdateSubBackboardRequest r, CancellationToken ct = default)
    {
        var b = await db.SubBackboards.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (b is null) return null;

        var size = r.Size.Trim();
        if (await db.SubBackboards.AnyAsync(x => x.Id != id && x.Size == size, ct))
            throw new DomainValidationException($"A sub-backboard with size '{size}' already exists.");

        b.Size = size;
        b.WarningStock = r.WarningStock;
        b.Status = r.Status;
        b.Description = r.Description;
        b.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return ToDto(b);
    }

    private static SubBackboardDto ToDto(SubBackboard b) =>
        new(b.Id, b.Size, b.InStock, b.WarningStock, b.Status, b.Description, b.UpdatedAt);
}
