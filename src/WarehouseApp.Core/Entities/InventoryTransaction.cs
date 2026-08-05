namespace WarehouseApp.Core.Entities;

/// <summary>An import/export goods movement header (FR009). <see cref="Type"/> and the
/// line-level Direction distinguish inbound vs outbound stock.</summary>
public class InventoryTransaction
{
    public long Id { get; set; }
    public int TransactionCode { get; set; }
    public short Type { get; set; }
    public DateOnly TransactionDate { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<InventoryTransactionDetail> Details { get; set; } = new();
}
