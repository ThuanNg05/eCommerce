namespace WarehouseApp.Core.Dtos;

public record ProductDto(
    long Id,
    string Sku,
    string Name,
    string? Description,
    decimal BasePrice,
    decimal? PriceRetail,
    decimal? PriceWholesale,
    long? SubBackboardId,
    int InStock,
    int WarningStock,
    short Status,
    DateTimeOffset UpdatedAt);

public record CreateProductRequest(
    string Sku,
    string Name,
    string? Description,
    decimal BasePrice,
    decimal? PriceRetail,
    decimal? PriceWholesale,
    long? SubBackboardId,
    int InStock,
    int WarningStock);

public record UpdateProductRequest(
    string Name,
    string? Description,
    decimal BasePrice,
    decimal? PriceRetail,
    decimal? PriceWholesale,
    long? SubBackboardId,
    int WarningStock,
    short Status);

/// <summary>Relative stock change: positive to receive, negative to consume/correct.</summary>
public record StockAdjustmentRequest(int Delta, string? Reason);

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, long TotalCount);
