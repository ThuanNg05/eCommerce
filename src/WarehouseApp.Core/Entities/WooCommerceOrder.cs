namespace WarehouseApp.Core.Entities;

/// <summary>Read-only local snapshot of an order imported from WooCommerce.</summary>
public class WooCommerceOrder
{
    public long WooCommerceOrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Currency { get; set; }
    public decimal Total { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
    public string? ShippingAddress { get; set; }
    public string? CustomerNote { get; set; }
    public DateTimeOffset? SourceCreatedAt { get; set; }
    public DateTimeOffset? SourceUpdatedAt { get; set; }
    public DateTimeOffset ReceivedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? ConfirmedInvoiceId { get; set; }
    public DateTimeOffset? ConfirmedAt { get; set; }

    public Invoice? ConfirmedInvoice { get; set; }
    public List<WooCommerceOrderItem> Items { get; set; } = new();
}
