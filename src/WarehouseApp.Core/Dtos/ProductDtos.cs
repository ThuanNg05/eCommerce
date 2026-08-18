namespace WarehouseApp.Core.Dtos;

/// <summary>A category a product belongs to (id + name only).</summary>
public record CategoryRefDto(long Id, string Name);

public record ProductDto(
    long Id,
    string Sku,
    string Name,
    string? Description,
    decimal BasePrice,
    decimal? PriceRetail,
    decimal? PriceWholesale,
    long? SubBackboardId,
    decimal? Width,
    decimal? Height,
    int InStock,
    int WarningStock,
    short Status,
    DateTimeOffset UpdatedAt,
    string? ImageUrl,
    IReadOnlyList<CategoryRefDto> Categories);

public record CreateProductRequest(
    string Sku,
    string Name,
    string? Description,
    decimal BasePrice,
    decimal? PriceRetail,
    decimal? PriceWholesale,
    long? SubBackboardId,
    decimal? Width,
    decimal? Height,
    int InStock,
    int? WarningStock,
    IReadOnlyList<long>? CategoryIds);

/// <summary><see cref="CategoryIds"/> null = leave the product's categories unchanged;
/// a list (including empty) = replace the whole set.</summary>
public record UpdateProductRequest(
    string Name,
    string? Description,
    decimal BasePrice,
    decimal? PriceRetail,
    decimal? PriceWholesale,
    long? SubBackboardId,
    decimal? Width,
    decimal? Height,
    int WarningStock,
    short Status,
    IReadOnlyList<long>? CategoryIds);

/// <summary>Relative stock change: positive to receive, negative to consume/correct.</summary>
public record StockAdjustmentRequest(int Delta, string? Reason);

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, long TotalCount);
