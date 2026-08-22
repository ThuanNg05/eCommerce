namespace WarehouseApp.Core.Entities;

/// <summary>Explicit mapping between one warehouse category and one WooCommerce category.</summary>
public class WooCommerceCategoryLink
{
    public long CategoryId { get; set; }
    public long WooCommerceCategoryId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Category? Category { get; set; }
}
