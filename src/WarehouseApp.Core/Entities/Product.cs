namespace WarehouseApp.Core.Entities;

/// <summary>
/// An inventory item held in the warehouse. Stock quantity is guarded by an
/// optimistic-concurrency token (Postgres xmin) so simultaneous edits from
/// multiple stations don't silently overwrite each other.
/// </summary>
public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal UnitPrice { get; set; }
    public int QuantityOnHand { get; set; }
    public int ReorderLevel { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Concurrency token mapped to the Postgres <c>xmin</c> system column.</summary>
    public uint Version { get; set; }
}
