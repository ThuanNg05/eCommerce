namespace WarehouseApp.Core.Entities;

/// <summary>
/// A line on an <see cref="Invoice"/>. Composite primary key (InvoiceId, ProductId).
/// <see cref="ProductName"/> and <see cref="UnitPrice"/> are snapshotted at invoice time
/// so historical documents stay stable even if the product is later renamed or repriced.
/// </summary>
public class InvoiceDetail
{
    public string InvoiceId { get; set; } = string.Empty;
    public long ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal Subtotal { get; set; }
    public string? Description { get; set; }

    public Invoice? Invoice { get; set; }
}
