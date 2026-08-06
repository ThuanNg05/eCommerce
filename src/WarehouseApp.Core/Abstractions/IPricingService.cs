using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Core.Abstractions;

public interface IPricingService
{
    Task<RateCardDto> GetRateCardAsync(CancellationToken ct = default);

    /// <summary>Updates the rate card and reprices <see cref="Entities.Product.BasePrice"/>
    /// for every product that has a component breakdown.</summary>
    Task<RateCardDto> UpdateRateCardAsync(UpdateRateCardRequest request, CancellationToken ct = default);

    /// <summary>Returns a product's component breakdown (empty values if none recorded yet),
    /// or null if the product does not exist.</summary>
    Task<ProductComponentDto?> GetComponentsAsync(long productId, CancellationToken ct = default);

    /// <summary>Creates or updates a product's component breakdown and recomputes its base
    /// price from the current rate card. Null if the product does not exist.</summary>
    Task<ProductComponentDto?> UpsertComponentsAsync(long productId, UpsertProductComponentRequest request, CancellationToken ct = default);
}
