namespace WarehouseApp.Core.Dtos;

public record LowStockItemDto(
    Guid ProductId,
    string Sku,
    string Name,
    int QuantityOnHand,
    int ReorderLevel);

public record SalesSummaryRowDto(
    DateOnly Date,
    int InvoiceCount,
    decimal Total);
