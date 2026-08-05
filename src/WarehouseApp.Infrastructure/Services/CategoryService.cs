using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

public class CategoryService(AppDbContext db) : ICategoryService
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
        var items = await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CategoryDto(c.Id, c.Name, c.CreatedAt))
            .ToListAsync(ct);

        return new PagedResult<CategoryDto>(items, page, pageSize, total);
    }

    public async Task<CategoryDto?> GetAsync(long id, CancellationToken ct = default)
    {
        var c = await db.Categories.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return c is null ? null : ToDto(c);
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryRequest r, CancellationToken ct = default)
    {
        var name = r.Name.Trim();
        if (await db.Categories.AnyAsync(c => c.Name == name, ct))
            throw new DomainValidationException($"A category named '{name}' already exists.");

        var c = new Category { Name = name };
        db.Categories.Add(c);
        await db.SaveChangesAsync(ct);
        return ToDto(c);
    }

    public async Task<CategoryDto?> UpdateAsync(long id, UpdateCategoryRequest r, CancellationToken ct = default)
    {
        var c = await db.Categories.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c is null) return null;

        var name = r.Name.Trim();
        if (await db.Categories.AnyAsync(x => x.Id != id && x.Name == name, ct))
            throw new DomainValidationException($"A category named '{name}' already exists.");

        c.Name = name;
        await db.SaveChangesAsync(ct);
        return ToDto(c);
    }

    private static CategoryDto ToDto(Category c) => new(c.Id, c.Name, c.CreatedAt);
}
