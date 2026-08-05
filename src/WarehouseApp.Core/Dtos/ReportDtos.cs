namespace WarehouseApp.Core.Dtos;

public record LowStockItemDto(
    long ProductId,
    string Sku,
    string Name,
    int InStock,
    int WarningStock);

public record SalesSummaryRowDto(
    DateOnly Date,
    int InvoiceCount,
    decimal Total);
