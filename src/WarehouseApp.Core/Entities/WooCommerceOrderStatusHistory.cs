namespace WarehouseApp.Core.Entities;

public class WooCommerceOrderStatusHistory
{
    public long Id { get; set; }
    public long WooCommerceOrderId { get; set; }
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = string.Empty;
    public string? ReasonCode { get; set; }
    public string? Note { get; set; }
    public string Source { get; set; } = string.Empty;
    public long? ChangedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public WooCommerceOrder? Order { get; set; }
    public WooCommerceOrderStatusReason? Reason { get; set; }
    public Account? ChangedByAccount { get; set; }
}
