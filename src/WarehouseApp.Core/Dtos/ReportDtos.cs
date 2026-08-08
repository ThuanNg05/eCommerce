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

/// <summary>Common filters for invoice-based statistics.</summary>
public record SalesReportFilter(
    DateOnly From,
    DateOnly To,
    long? CategoryId = null,
    long? ProductId = null,
    long? CustomerId = null,
    string? GroupPrice = null,
    string? Search = null);

public record SalesOverviewDto(
    decimal Revenue,
    int InvoiceCount,
    int UnitsSold,
    decimal AverageInvoiceValue);

public record TopProductDto(
    long ProductId,
    string Sku,
    string Name,
    int QuantitySold,
    int InvoiceCount,
    decimal Revenue);

public record TopCustomerDto(
    long CustomerId,
    string Name,
    string Phone,
    string? GroupPrice,
    int InvoiceCount,
    int UnitsSold,
    decimal Revenue);

public record InventoryFlowRowDto(
    DateOnly Date,
    int InQuantity,
    int OutQuantity,
    decimal InValue,
    decimal OutValue);

public record InvoiceReportRowDto(
    string InvoiceId,
    DateTimeOffset CreatedAt,
    long CustomerId,
    string CustomerName,
    string CustomerPhone,
    string? GroupPrice,
    long ProductId,
    string Sku,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal Subtotal,
    string? Description);
