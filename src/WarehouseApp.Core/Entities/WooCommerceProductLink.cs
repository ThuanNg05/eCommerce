namespace WarehouseApp.Core.Entities;

/// <summary>Explicit relation between one warehouse product and a WooCommerce product or variation.</summary>
public class WooCommerceProductLink
{
    public long ProductId { get; set; }
    public long WooCommerceProductId { get; set; }
    public long? WooCommerceVariationId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Product? Product { get; set; }
}
