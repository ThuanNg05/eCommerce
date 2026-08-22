using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

public class CategoryService(AppDbContext db, IWooCommerceService wooCommerce) : ICategoryService
{
    public async Task<PagedResult<CategoryDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = db.Categories.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(c => EF.Functions.ILike(c.Name, $"%{s}%"));
        }

        var total = await query.LongCountAsync(ct);
        var categories = await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var links = await GetLinksAsync(categories.Select(x => x.Id), ct);
        var items = categories.Select(x => ToDto(x, links.GetValueOrDefault(x.Id))).ToList();

        return new PagedResult<CategoryDto>(items, page, pageSize, total);
    }

    public async Task<CategoryDto?> GetAsync(long id, CancellationToken ct = default)
    {
        var c = await db.Categories.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c is null) return null;
        var link = await db.WooCommerceCategoryLinks.AsNoTracking().SingleOrDefaultAsync(x => x.CategoryId == c.Id, ct);
        return ToDto(c, link);
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryRequest r, CancellationToken ct = default)
    {
        var name = r.Name.Trim();
        if (await db.Categories.AnyAsync(c => c.Name == name, ct))
            throw new DomainValidationException($"Danh mục '{name}' đã tồn tại.");

        var c = new Category { Name = name };
        db.Categories.Add(c);
        await db.SaveChangesAsync(ct);
        var link = r.SyncToWooCommerce
            ? await wooCommerce.PublishAndLinkCategoryAsync(new LinkWarehouseCategoryRequest(c.Id), ct)
            : null;
        return new CategoryDto(c.Id, c.Name, c.IsActive, c.CreatedAt, link);
    }

    public async Task<CategoryDto?> UpdateAsync(long id, UpdateCategoryRequest r, CancellationToken ct = default)
    {
        var c = await db.Categories.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c is null) return null;

        var name = r.Name.Trim();
        if (await db.Categories.AnyAsync(x => x.Id != id && x.Name == name, ct))
            throw new DomainValidationException($"Danh mục '{name}' đã tồn tại.");

        c.Name = name;
        await db.SaveChangesAsync(ct);
        if (c.IsActive)
            await wooCommerce.SyncLinkedCategoryAsync(c.Id, ct);
        var link = await db.WooCommerceCategoryLinks.AsNoTracking().SingleOrDefaultAsync(x => x.CategoryId == c.Id, ct);
        return ToDto(c, link);
    }

    public async Task<CategoryDto?> UpdateStatusAsync(long id, UpdateCategoryStatusRequest r, CancellationToken ct = default)
    {
        var c = await db.Categories.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c is null) return null;
        if (c.IsActive != r.IsActive)
        {
            c.IsActive = r.IsActive;
            await db.SaveChangesAsync(ct);
        }

        var link = await db.WooCommerceCategoryLinks.AsNoTracking().SingleOrDefaultAsync(x => x.CategoryId == c.Id, ct);
        return ToDto(c, link);
    }

    private async Task<Dictionary<long, WooCommerceCategoryLink>> GetLinksAsync(IEnumerable<long> categoryIds, CancellationToken ct)
    {
        var ids = categoryIds.ToList();
        return await db.WooCommerceCategoryLinks.AsNoTracking().Where(x => ids.Contains(x.CategoryId))
            .ToDictionaryAsync(x => x.CategoryId, ct);
    }

    private static CategoryDto ToDto(Category c, WooCommerceCategoryLink? link = null) =>
        new(c.Id, c.Name, c.IsActive, c.CreatedAt,
            link is null ? null : new WooCommerceCategoryLinkDto(link.CategoryId, link.WooCommerceCategoryId));
}
