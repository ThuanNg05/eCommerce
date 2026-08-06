using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

public class BackboardService(AppDbContext db) : IBackboardService
{
    public async Task<PagedResult<BackboardDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = db.Backboards.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(b => b.Description != null && EF.Functions.ILike(b.Description, $"%{s}%"));
        }

        var total = await query.LongCountAsync(ct);
        var items = await query
            .OrderBy(b => b.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new BackboardDto(
                b.Id, b.Type, b.ImportPrice, b.SalePrice, b.InStock, b.WarningStock, b.Status, b.Description, b.UpdatedAt))
            .ToListAsync(ct);

        return new PagedResult<BackboardDto>(items, page, pageSize, total);
    }

    public async Task<BackboardDto?> GetAsync(long id, CancellationToken ct = default)
    {
        var b = await db.Backboards.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return b is null ? null : ToDto(b);
    }

    public async Task<BackboardDto> CreateAsync(CreateBackboardRequest r, CancellationToken ct = default)
    {
        var b = new Backboard
        {
            Type = r.Type,
            ImportPrice = r.ImportPrice,
            SalePrice = r.SalePrice,
            InStock = r.InStock,
            WarningStock = r.WarningStock,
            Description = r.Description,
            Status = 1
        };
        db.Backboards.Add(b);
        await db.SaveChangesAsync(ct);
        return ToDto(b);
    }

    public async Task<BackboardDto?> UpdateAsync(long id, UpdateBackboardRequest r, CancellationToken ct = default)
    {
        var b = await db.Backboards.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (b is null) return null;

        b.Type = r.Type;
        b.ImportPrice = r.ImportPrice;
        b.SalePrice = r.SalePrice;
        b.WarningStock = r.WarningStock;
        b.Status = r.Status;
        b.Description = r.Description;
        b.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return ToDto(b);
    }

    private static BackboardDto ToDto(Backboard b) =>
        new(b.Id, b.Type, b.ImportPrice, b.SalePrice, b.InStock, b.WarningStock, b.Status, b.Description, b.UpdatedAt);
}
