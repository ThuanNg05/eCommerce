using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

public class InventoryService(AppDbContext db) : IInventoryService
{
    private const int DefaultWarningStock = 10;

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
        var products = await query
            .OrderBy(p => p.Sku)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var cats = await LoadCategoriesAsync(products.Select(p => p.Id).ToList(), ct);
        var items = products
            .Select(p => ToDto(p, cats.TryGetValue(p.Id, out var c) ? c : new List<CategoryRefDto>()))
            .ToList();

        return new PagedResult<ProductDto>(items, page, pageSize, total);
    }

    public async Task<ProductDto?> GetAsync(long id, CancellationToken ct = default)
    {
        var p = await db.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return p is null ? null : ToDto(p, await CategoriesOfAsync(id, ct));
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest r, CancellationToken ct = default)
    {
        if (await db.Products.AnyAsync(p => p.Sku == r.Sku, ct))
            throw new DomainValidationException($"Sản phẩm có SKU '{r.Sku}' đã tồn tại.");

        var categories = await ResolveCategoriesAsync(r.CategoryIds, ct);
        ValidateDimensions(r.Width, r.Height);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var p = new Product
        {
            Sku = r.Sku.Trim(),
            Name = r.Name.Trim(),
            Description = r.Description,
            BasePrice = r.BasePrice,
            PriceRetail = r.PriceRetail,
            PriceWholesale = r.PriceWholesale,
            SubBackboardId = r.SubBackboardId,
            Width = r.Width,
            Height = r.Height,
            InStock = r.InStock,
            WarningStock = r.WarningStock ?? DefaultWarningStock,
            Status = 1
        };

        db.Products.Add(p);
        await db.SaveChangesAsync(ct); // assigns p.Id

        AddCategories(p.Id, categories);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return ToDto(p, categories);
    }

    public async Task<ProductDto?> UpdateAsync(long id, UpdateProductRequest r, CancellationToken ct = default)
    {
        var p = await db.Products.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return null;

        // Null CategoryIds => leave categories untouched; a list (even empty) => replace the set.
        var categories = r.CategoryIds is null ? null : await ResolveCategoriesAsync(r.CategoryIds, ct);
        ValidateDimensions(r.Width, r.Height);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        p.Name = r.Name.Trim();
        p.Description = r.Description;
        p.BasePrice = r.BasePrice;
        p.PriceRetail = r.PriceRetail;
        p.PriceWholesale = r.PriceWholesale;
        p.SubBackboardId = r.SubBackboardId;
        p.Width = r.Width;
        p.Height = r.Height;
        p.WarningStock = r.WarningStock;
        p.Status = r.Status;
        p.UpdatedAt = DateTimeOffset.UtcNow;

        if (categories is not null)
        {
            var existing = await db.ProductCategories.Where(pc => pc.ProductId == id).ToListAsync(ct);
            db.ProductCategories.RemoveRange(existing);
            AddCategories(id, categories);
        }

        try
        {
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            await tx.RollbackAsync(ct);
            throw new ConcurrencyConflictException("Sản phẩm đã được cập nhật ở máy khác. Vui lòng tải lại và thử lại.");
        }

        return ToDto(p, categories ?? await CategoriesOfAsync(id, ct));
    }

    public async Task<ProductDto?> SetImageUrlAsync(long id, string? imageUrl, CancellationToken ct = default)
    {
        var p = await db.Products.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return null;

        p.ImageUrl = imageUrl;
        p.UpdatedAt = DateTimeOffset.UtcNow;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConcurrencyConflictException("Sản phẩm đã được cập nhật ở máy khác. Vui lòng tải lại và thử lại.");
        }

        return ToDto(p, await CategoriesOfAsync(id, ct));
    }

    public async Task<ProductDto?> AdjustStockAsync(long id, StockAdjustmentRequest r, CancellationToken ct = default)
    {
        var p = await db.Products.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return null;

        var newQty = (long)p.InStock + r.Delta;
        if (newQty < 0)
            throw DomainErrors.InsufficientStock();
        if (newQty > int.MaxValue)
            throw new DomainValidationException("Tồn kho sản phẩm vượt giới hạn cho phép.");

        p.InStock = (int)newQty;
        p.UpdatedAt = DateTimeOffset.UtcNow;

        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConcurrencyConflictException("Tồn kho sản phẩm đã thay đổi ở máy khác. Vui lòng tải lại và thử lại.");
        }

        return ToDto(p, await CategoriesOfAsync(id, ct));
    }

    // ----- product <-> category helpers -----

    /// <summary>Validates that every requested category id exists and returns their {id,name}.
    /// Null/empty input yields an empty list.</summary>
    private async Task<List<CategoryRefDto>> ResolveCategoriesAsync(IReadOnlyList<long>? categoryIds, CancellationToken ct)
    {
        var ids = (categoryIds ?? Array.Empty<long>()).Where(i => i > 0).Distinct().ToList();
        if (ids.Count == 0) return new();

        var found = await db.Categories.AsNoTracking()
            .Where(c => ids.Contains(c.Id) && c.IsActive)
            .Select(c => new CategoryRefDto(c.Id, c.Name))
            .ToListAsync(ct);

        var missing = ids.Except(found.Select(c => c.Id)).ToList();
        if (missing.Count > 0)
            throw new DomainValidationException($"Không tìm thấy danh mục có mã: {string.Join(", ", missing)}.");

        return found;
    }

    private void AddCategories(long productId, IEnumerable<CategoryRefDto> categories)
    {
        foreach (var c in categories)
            db.ProductCategories.Add(new ProductCategory { ProductId = productId, CategoryId = c.Id });
    }

    private async Task<List<CategoryRefDto>> CategoriesOfAsync(long productId, CancellationToken ct) =>
        (await LoadCategoriesAsync(new[] { productId }, ct)).TryGetValue(productId, out var c) ? c : new();

    private async Task<Dictionary<long, List<CategoryRefDto>>> LoadCategoriesAsync(IReadOnlyCollection<long> productIds, CancellationToken ct)
    {
        if (productIds.Count == 0) return new();

        var rows = await (
            from pc in db.ProductCategories.AsNoTracking()
            join c in db.Categories.AsNoTracking() on pc.CategoryId equals c.Id
            where productIds.Contains(pc.ProductId)
            select new { pc.ProductId, c.Id, c.Name }
        ).ToListAsync(ct);

        return rows
            .GroupBy(x => x.ProductId)
            .ToDictionary(g => g.Key, g => g.Select(x => new CategoryRefDto(x.Id, x.Name)).ToList());
    }

    private static ProductDto ToDto(Product p, IReadOnlyList<CategoryRefDto> categories) =>
        new(p.Id, p.Sku, p.Name, p.Description, p.BasePrice, p.PriceRetail, p.PriceWholesale,
            p.SubBackboardId, p.Width, p.Height, p.InStock, p.WarningStock, p.Status, p.UpdatedAt, p.ImageUrl, categories);

    private static void ValidateDimensions(decimal? width, decimal? height)
    {
        if (width.HasValue != height.HasValue)
            throw new DomainValidationException("Phải nhập cả chiều rộng và chiều cao, hoặc để trống cả hai.");
        if (width is <= 0 || height is <= 0)
            throw new DomainValidationException("Chiều rộng và chiều cao phải lớn hơn 0.");
    }
}
