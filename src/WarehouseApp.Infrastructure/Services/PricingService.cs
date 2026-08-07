using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core;
using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;
using WarehouseApp.Core.Entities;
using WarehouseApp.Infrastructure.Data;

namespace WarehouseApp.Infrastructure.Services;

/// <summary>
/// The pricing model (FR — "Định giá & Công thức"): a singleton <see cref="SubPrice"/> rate
/// card plus each product's <see cref="ProductComponent"/> breakdown. Base price is
/// <c>Wage + Σ (Pr&lt;X&gt; * coalesce(Val&lt;X&gt;, 0))</c>. Editing the rate card reprices
/// every product with a breakdown; editing a breakdown reprices that one product. Both
/// persist the result to <see cref="Product.BasePrice"/> so downstream reads stay consistent.
/// </summary>
public class PricingService(AppDbContext db) : IPricingService
{
    public async Task<RateCardDto> GetRateCardAsync(CancellationToken ct = default) =>
        ToRateCardDto(await LoadCardOrDefaultAsync(ct));

    public async Task<RateCardDto> UpdateRateCardAsync(UpdateRateCardRequest r, CancellationToken ct = default)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var card = await db.SubPrices.FirstOrDefaultAsync(s => s.Id == 1, ct);
        if (card is null)
        {
            card = new SubPrice { Id = 1 };
            db.SubPrices.Add(card);
        }
        ApplyRates(card, r);
        card.UpdatedAt = DateTimeOffset.UtcNow;

        // Reprice every product that has a component breakdown.
        var components = await db.ProductComponents.ToListAsync(ct);
        if (components.Count > 0)
        {
            var ids = components.Select(c => c.ProductId).ToList();
            var products = await db.Products.Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);
            foreach (var c in components)
            {
                if (!products.TryGetValue(c.ProductId, out var p)) continue;
                p.BasePrice = ComputeBasePrice(card, c);
                p.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }

        try
        {
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            await tx.RollbackAsync(ct);
            throw new ConcurrencyConflictException("Giá sản phẩm đã được thay đổi ở máy khác trong lúc cập nhật. Vui lòng thử lại.");
        }

        return ToRateCardDto(card);
    }

    public async Task<ProductComponentDto?> GetComponentsAsync(long productId, CancellationToken ct = default)
    {
        var product = await db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == productId, ct);
        if (product is null) return null;

        var comp = await db.ProductComponents.AsNoTracking().FirstOrDefaultAsync(c => c.ProductId == productId, ct);
        return comp is null
            ? EmptyComponentDto(productId, product.BasePrice, product.UpdatedAt)
            : ToComponentDto(comp, product.BasePrice);
    }

    public async Task<ProductComponentDto?> UpsertComponentsAsync(long productId, UpsertProductComponentRequest r, CancellationToken ct = default)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == productId, ct);
        if (product is null) return null;

        var comp = await db.ProductComponents.FirstOrDefaultAsync(c => c.ProductId == productId, ct);
        var isNew = comp is null;
        comp ??= new ProductComponent { ProductId = productId };
        ApplyComponents(comp, r);
        comp.UpdatedAt = DateTimeOffset.UtcNow;
        if (isNew) db.ProductComponents.Add(comp);

        var card = await LoadCardOrDefaultAsync(ct);
        product.BasePrice = ComputeBasePrice(card, comp);
        product.UpdatedAt = DateTimeOffset.UtcNow;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConcurrencyConflictException("Sản phẩm đã được cập nhật ở máy khác. Vui lòng tải lại và thử lại.");
        }

        return ToComponentDto(comp, product.BasePrice);
    }

    // ----- pricing math -----

    private static decimal ComputeBasePrice(SubPrice r, ProductComponent c) =>
        c.Wage
        + r.PrKieng * (c.ValKieng ?? 0m)
        + r.PrNhL   * (c.ValNhL ?? 0m)
        + r.PrNhN   * (c.ValNhN ?? 0m)
        + r.PrGL    * (c.ValGL ?? 0m)
        + r.PrGN    * (c.ValGN ?? 0m)
        + r.PrDL    * (c.ValDL ?? 0m)
        + r.PrBack  * (c.ValBack ?? 0m)
        + r.PrLua   * (c.ValLua ?? 0m)
        + r.PrKT    * (c.ValKT ?? 0m)
        + r.PrOc    * (c.ValOc ?? 0m)
        + r.PrNhom  * (c.ValNhom ?? 0m)
        + r.Pr7F    * (c.Val7F ?? 0m)
        + r.Pr2D    * (c.Val2D ?? 0m)
        + r.PrDecal * (c.ValDecal ?? 0m);

    // ----- helpers -----

    private async Task<SubPrice> LoadCardOrDefaultAsync(CancellationToken ct) =>
        await db.SubPrices.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1, ct) ?? new SubPrice { Id = 1 };

    private static void ApplyRates(SubPrice s, UpdateRateCardRequest r)
    {
        s.PrKieng = r.PrKieng; s.PrNhL = r.PrNhL; s.PrNhN = r.PrNhN; s.PrGL = r.PrGL;
        s.PrGN = r.PrGN; s.PrDL = r.PrDL; s.PrBack = r.PrBack; s.PrLua = r.PrLua;
        s.PrKT = r.PrKT; s.PrOc = r.PrOc; s.PrNhom = r.PrNhom; s.Pr7F = r.Pr7F;
        s.Pr2D = r.Pr2D; s.PrDecal = r.PrDecal;
    }

    private static void ApplyComponents(ProductComponent c, UpsertProductComponentRequest r)
    {
        c.Wage = r.Wage;
        c.ValKieng = r.ValKieng; c.ValNhL = r.ValNhL; c.ValNhN = r.ValNhN; c.ValGL = r.ValGL;
        c.ValGN = r.ValGN; c.ValDL = r.ValDL; c.ValBack = r.ValBack; c.ValLua = r.ValLua;
        c.ValKT = r.ValKT; c.ValOc = r.ValOc; c.ValNhom = r.ValNhom; c.Val7F = r.Val7F;
        c.Val2D = r.Val2D; c.ValDecal = r.ValDecal;
    }

    private static RateCardDto ToRateCardDto(SubPrice s) => new(
        s.PrKieng, s.PrNhL, s.PrNhN, s.PrGL, s.PrGN, s.PrDL, s.PrBack, s.PrLua,
        s.PrKT, s.PrOc, s.PrNhom, s.Pr7F, s.Pr2D, s.PrDecal, s.UpdatedAt);

    private static ProductComponentDto ToComponentDto(ProductComponent c, decimal basePrice) => new(
        c.ProductId, c.Wage,
        c.ValKieng, c.ValNhL, c.ValNhN, c.ValGL, c.ValGN, c.ValDL, c.ValBack, c.ValLua,
        c.ValKT, c.ValOc, c.ValNhom, c.Val7F, c.Val2D, c.ValDecal,
        basePrice, c.UpdatedAt);

    private static ProductComponentDto EmptyComponentDto(long productId, decimal basePrice, DateTimeOffset updatedAt) => new(
        productId, 0m,
        null, null, null, null, null, null, null, null, null, null, null, null, null, null,
        basePrice, updatedAt);
}
