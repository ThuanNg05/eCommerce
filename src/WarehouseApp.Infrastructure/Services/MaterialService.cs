using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

public class MaterialService(AppDbContext db) : IMaterialService
{
    public async Task<PagedResult<MaterialDto>> ListAsync(int page, int pageSize, string? search, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = db.Materials.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(m => EF.Functions.ILike(m.Name, $"%{s}%"));
        }

        var total = await query.LongCountAsync(ct);
        var items = await query
            .OrderBy(m => m.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new MaterialDto(
                m.Id, m.Name, m.Unit, m.ImportPrice, m.SalePrice, m.InStock, m.WarningStock, m.Status, m.Description, m.UpdatedAt))
            .ToListAsync(ct);

        return new PagedResult<MaterialDto>(items, page, pageSize, total);
    }

    public async Task<MaterialDto?> GetAsync(long id, CancellationToken ct = default)
    {
        var m = await db.Materials.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return m is null ? null : ToDto(m);
    }

    public async Task<MaterialDto> CreateAsync(CreateMaterialRequest r, CancellationToken ct = default)
    {
        var name = r.Name.Trim();
        var unit = NormalizeUnit(r.Unit);
        if (await db.Materials.AnyAsync(m => m.Name == name, ct))
            throw new DomainValidationException($"A material named '{name}' already exists.");

        var m = new Material
        {
            Name = name,
            Unit = unit,
            ImportPrice = r.ImportPrice,
            SalePrice = r.SalePrice,
            InStock = r.InStock,
            WarningStock = r.WarningStock,
            Description = r.Description,
            Status = 1
        };
        db.Materials.Add(m);
        await db.SaveChangesAsync(ct);
        return ToDto(m);
    }

    public async Task<MaterialDto?> UpdateAsync(long id, UpdateMaterialRequest r, CancellationToken ct = default)
    {
        var m = await db.Materials.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (m is null) return null;

        var name = r.Name.Trim();
        var unit = NormalizeUnit(r.Unit);
        if (await db.Materials.AnyAsync(x => x.Id != id && x.Name == name, ct))
            throw new DomainValidationException($"A material named '{name}' already exists.");

        m.Name = name;
        m.Unit = unit;
        m.ImportPrice = r.ImportPrice;
        m.SalePrice = r.SalePrice;
        m.WarningStock = r.WarningStock;
        m.Status = r.Status;
        m.Description = r.Description;
        m.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return ToDto(m);
    }

    private static MaterialDto ToDto(Material m) =>
        new(m.Id, m.Name, m.Unit, m.ImportPrice, m.SalePrice, m.InStock, m.WarningStock, m.Status, m.Description, m.UpdatedAt);

    private static string? NormalizeUnit(string? unit)
    {
        if (string.IsNullOrWhiteSpace(unit)) return null;
        var normalized = unit.Trim();
        if (normalized.Length > 50)
            throw new DomainValidationException("Material unit must be at most 50 characters.");
        return normalized;
    }
}
