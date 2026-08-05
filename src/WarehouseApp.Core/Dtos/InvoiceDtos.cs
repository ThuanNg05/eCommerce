namespace WarehouseApp.Core.Dtos;

public record InvoiceLineDto(
    long ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal Subtotal,
    string? Description);

public record InvoiceDto(
    string Id,
    long CustomerId,
    decimal Total,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<InvoiceLineDto> Lines);

public record InvoiceSummaryDto(
    string Id,
    long CustomerId,
    decimal Total,
    DateTimeOffset CreatedAt);

public record CreateInvoiceLineRequest(long ProductId, int Quantity);

public record CreateInvoiceRequest(
    long CustomerId,
    IReadOnlyList<CreateInvoiceLineRequest> Lines);
