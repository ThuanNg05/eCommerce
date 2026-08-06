namespace WarehouseApp.Core.Dtos;

/// <summary>The singleton rate card: current unit price of each of the 14 component types.</summary>
public record RateCardDto(
    decimal PrKieng, decimal PrNhL, decimal PrNhN, decimal PrGL, decimal PrGN,
    decimal PrDL, decimal PrBack, decimal PrLua, decimal PrKT, decimal PrOc,
    decimal PrNhom, decimal Pr7F, decimal Pr2D, decimal PrDecal,
    DateTimeOffset UpdatedAt);

public record UpdateRateCardRequest(
    decimal PrKieng, decimal PrNhL, decimal PrNhN, decimal PrGL, decimal PrGN,
    decimal PrDL, decimal PrBack, decimal PrLua, decimal PrKT, decimal PrOc,
    decimal PrNhom, decimal Pr7F, decimal Pr2D, decimal PrDecal);

/// <summary>A product's price composition. Each <c>Val*</c> is null when that component is
/// not part of the product. <see cref="BasePrice"/> is the server-computed result of
/// applying the current rate card to these values.</summary>
public record ProductComponentDto(
    long ProductId, decimal Wage,
    decimal? ValKieng, decimal? ValNhL, decimal? ValNhN, decimal? ValGL, decimal? ValGN,
    decimal? ValDL, decimal? ValBack, decimal? ValLua, decimal? ValKT, decimal? ValOc,
    decimal? ValNhom, decimal? Val7F, decimal? Val2D, decimal? ValDecal,
    decimal BasePrice, DateTimeOffset UpdatedAt);

public record UpsertProductComponentRequest(
    decimal Wage,
    decimal? ValKieng, decimal? ValNhL, decimal? ValNhN, decimal? ValGL, decimal? ValGN,
    decimal? ValDL, decimal? ValBack, decimal? ValLua, decimal? ValKT, decimal? ValOc,
    decimal? ValNhom, decimal? Val7F, decimal? Val2D, decimal? ValDecal);
