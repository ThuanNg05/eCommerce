using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

public class InventoryService(AppDbContext db) : IInventoryService
{
    public async Task<PagedResult<ProductDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = db.Products.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(p => EF.Functions.ILike(p.Sku, $"%{s}%") || EF.Functions.ILike(p.Name, $"%{s}%"));
        }

        var total = await query.LongCountAsync(ct);
        var items = await query
            .OrderBy(p => p.Sku)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProductDto(
                p.Id, p.Sku, p.Name, p.Description, p.BasePrice, p.PriceRetail, p.PriceWholesale,
                p.SubBackboardId, p.InStock, p.WarningStock, p.Status, p.UpdatedAt))
            .ToListAsync(ct);

        return new PagedResult<ProductDto>(items, page, pageSize, total);
    }

    public async Task<ProductDto?> GetAsync(long id, CancellationToken ct = default)
    {
        var p = await db.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return p is null ? null : ToDto(p);
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest r, CancellationToken ct = default)
    {
        if (await db.Products.AnyAsync(p => p.Sku == r.Sku, ct))
            throw new DomainValidationException($"A product with SKU '{r.Sku}' already exists.");

        var p = new Product
        {
            Sku = r.Sku.Trim(),
            Name = r.Name.Trim(),
            Description = r.Description,
            BasePrice = r.BasePrice,
            PriceRetail = r.PriceRetail,
            PriceWholesale = r.PriceWholesale,
            SubBackboardId = r.SubBackboardId,
            InStock = r.InStock,
            WarningStock = r.WarningStock,
            Status = 1
        };

        db.Products.Add(p);
        await db.SaveChangesAsync(ct);
        return ToDto(p);
    }

    public async Task<ProductDto?> UpdateAsync(long id, UpdateProductRequest r, CancellationToken ct = default)
    {
        var p = await db.Products.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return null;

        p.Name = r.Name.Trim();
        p.Description = r.Description;
        p.BasePrice = r.BasePrice;
        p.PriceRetail = r.PriceRetail;
        p.PriceWholesale = r.PriceWholesale;
        p.SubBackboardId = r.SubBackboardId;
        p.WarningStock = r.WarningStock;
        p.Status = r.Status;
        p.UpdatedAt = DateTimeOffset.UtcNow;

        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConcurrencyConflictException("This product was modified on another station. Reload and try again.");
        }

        return ToDto(p);
    }

    public async Task<ProductDto?> AdjustStockAsync(long id, StockAdjustmentRequest r, CancellationToken ct = default)
    {
        var p = await db.Products.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return null;

        var newQty = p.InStock + r.Delta;
        if (newQty < 0)
            throw new DomainValidationException($"Adjustment of {r.Delta} would drive '{p.Sku}' below zero (in stock {p.InStock}).");

        p.InStock = newQty;
        p.UpdatedAt = DateTimeOffset.UtcNow;

        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConcurrencyConflictException("Stock for this product changed on another station. Reload and try again.");
        }

        return ToDto(p);
    }

    private static ProductDto ToDto(Product p) =>
        new(p.Id, p.Sku, p.Name, p.Description, p.BasePrice, p.PriceRetail, p.PriceWholesale,
            p.SubBackboardId, p.InStock, p.WarningStock, p.Status, p.UpdatedAt);
}
