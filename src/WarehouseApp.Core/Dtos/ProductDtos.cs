namespace WarehouseApp.Core.Dtos;

public record ProductDto(
    Guid Id,
    string Sku,
    string Name,
    string? Description,
    decimal UnitPrice,
    int QuantityOnHand,
    int ReorderLevel,
    bool IsActive,
    DateTimeOffset UpdatedAt);

public record CreateProductRequest(
    string Sku,
    string Name,
    string? Description,
    decimal UnitPrice,
    int QuantityOnHand,
    int ReorderLevel);

public record UpdateProductRequest(
    string Name,
    string? Description,
    decimal UnitPrice,
    int ReorderLevel,
    bool IsActive);

/// <summary>Relative stock change: positive to receive, negative to consume/correct.</summary>
public record StockAdjustmentRequest(int Delta, string? Reason);

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, long TotalCount);
