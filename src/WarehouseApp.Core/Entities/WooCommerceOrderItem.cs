namespace WarehouseApp.Core.Entities;

/// <summary>A line item snapshot from a WooCommerce order.</summary>
public class WooCommerceOrderItem
{
    public long WooCommerceOrderItemId { get; set; }
    public long WooCommerceOrderId { get; set; }
    public long? WooCommerceProductId { get; set; }
    public long? WooCommerceVariationId { get; set; }
    public long? ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Subtotal { get; set; }

    public WooCommerceOrder? Order { get; set; }
    public Product? Product { get; set; }
}
