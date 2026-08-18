namespace WarehouseApp.Core.Entities;

public class WooCommerceOrderStatusReason
{
    public string Code { get; set; } = string.Empty;
    public string TargetStatus { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
