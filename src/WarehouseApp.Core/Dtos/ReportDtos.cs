namespace WarehouseApp.Core.Dtos;

public record LowStockItemDto(
    long ProductId,
    string Sku,
    string Name,
    int InStock);

public record SalesSummaryRowDto(
    DateOnly Date,
    int InvoiceCount,
    decimal Total);
