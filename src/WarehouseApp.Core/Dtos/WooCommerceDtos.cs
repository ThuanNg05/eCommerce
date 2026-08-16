namespace WarehouseApp.Core.Dtos;

public record WooCommerceOrderLineDto(
    long WooCommerceOrderItemId,
    long? WooCommerceProductId,
    long? WooCommerceVariationId,
    long? ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal Subtotal,
    int? AvailableStock,
    string Availability);

public record WooCommerceOrderDto(
    long WooCommerceOrderId,
    string OrderNumber,
    string Status,
    string? Currency,
    decimal Total,
    string? CustomerName,
    string? CustomerEmail,
    string? CustomerPhone,
    string? ShippingAddress,
    DateTimeOffset? SourceCreatedAt,
    DateTimeOffset? SourceUpdatedAt,
    string? ConfirmedInvoiceId,
    DateTimeOffset? ConfirmedAt,
    string Availability,
    string AvailabilityLabel,
    IReadOnlyList<WooCommerceOrderLineDto> Lines);

public record WooCommerceProductLinkDto(long ProductId, long WooCommerceProductId, long? WooCommerceVariationId);

public record LinkWooCommerceProductRequest(long ProductId, long? WooCommerceVariationId = null);

/// <summary>Manual fulfilment is intentionally explicit: it creates one warehouse invoice only after stock validation.</summary>
public record ConfirmWooCommerceOrderRequest(long CustomerId);

public record WooCommerceSyncResult(int ImportedOrders, int ImportedProducts, DateTimeOffset CompletedAt);

public record WooCommerceCatalogSyncResult(int UpdatedProducts, DateTimeOffset CompletedAt);
