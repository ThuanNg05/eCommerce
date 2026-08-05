namespace WarehouseApp.Core.Entities;

/// <summary>A single line of an <see cref="InventoryTransaction"/>. Exactly one of the
/// item foreign keys is set, depending on what kind of good is being moved — the rest
/// are null.</summary>
public class InventoryTransactionDetail
{
    public long Id { get; set; }
    public long InventoryTransactionId { get; set; }
    public long? ProductId { get; set; }
    public long? BackboardId { get; set; }
    public long? MaterialId { get; set; }
    public long? FrameId { get; set; }
    public long? SubBackboardId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public short Direction { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public InventoryTransaction? Transaction { get; set; }
}
