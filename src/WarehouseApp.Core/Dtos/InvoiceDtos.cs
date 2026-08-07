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

/// <summary>
/// A requested invoice line. <see cref="UnitPrice"/> is optional: when omitted,
/// the server selects the customer's configured retail/wholesale price. A supplied
/// non-negative value is snapshotted on the invoice.
/// </summary>
public record CreateInvoiceLineRequest(
    long ProductId,
    int Quantity,
    decimal? UnitPrice = null,
    string? Description = null);

public record CreateInvoiceRequest(
    long CustomerId,
    IReadOnlyList<CreateInvoiceLineRequest> Lines);
