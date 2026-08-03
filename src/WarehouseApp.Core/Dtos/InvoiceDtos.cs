using WarehouseApp.Core.Enums;

namespace WarehouseApp.Core.Dtos;

public record InvoiceLineDto(
    Guid Id,
    Guid ProductId,
    string Sku,
    string Description,
    int Quantity,
    decimal UnitPrice,
    decimal LineTotal);

public record InvoiceDto(
    Guid Id,
    string Number,
    string CustomerName,
    InvoiceStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? IssuedAt,
    decimal Subtotal,
    decimal TaxRate,
    decimal TaxAmount,
    decimal Total,
    IReadOnlyList<InvoiceLineDto> Lines);

public record InvoiceSummaryDto(
    Guid Id,
    string Number,
    string CustomerName,
    InvoiceStatus Status,
    DateTimeOffset CreatedAt,
    decimal Total);

public record CreateInvoiceLineRequest(Guid ProductId, int Quantity);

public record CreateInvoiceRequest(
    string CustomerName,
    decimal TaxRate,
    IReadOnlyList<CreateInvoiceLineRequest> Lines);
