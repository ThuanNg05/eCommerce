namespace WarehouseApp.Core.Entities;

/// <summary>
/// A sellable product. <see cref="BasePrice"/> is the computed cost from the pricing
/// model (see <see cref="ProductComponent"/> + SubPrice rate card); retail/wholesale
/// are the customer-facing prices. Stock is guarded by an optimistic-concurrency token
/// (Postgres <c>xmin</c>) so simultaneous edits from multiple stations don't silently
/// overwrite each other.
/// </summary>
public class Product
{
    public long Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal BasePrice { get; set; }
    public decimal? PriceRetail { get; set; }
    public decimal? PriceWholesale { get; set; }
    public long? SubBackboardId { get; set; }
    public decimal? Width { get; set; }
    public decimal? Height { get; set; }
    public int InStock { get; set; }
    /// <summary>Minimum-stock threshold for reorder alerts: low when InStock &lt;= WarningStock.</summary>
    public int WarningStock { get; set; }
    public short Status { get; set; } = 1;
    public string? Description { get; set; }
    /// <summary>Application-managed public URL of the product image, stored as JPEG.</summary>
    public string? ImageUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Concurrency token mapped to the Postgres <c>xmin</c> system column.</summary>
    public uint Version { get; set; }
}
