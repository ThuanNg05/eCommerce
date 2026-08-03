using WarehouseApp.Core.Enums;

namespace WarehouseApp.Core.Entities;

public class Invoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Number { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? IssuedAt { get; set; }

    public decimal Subtotal { get; set; }
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Total { get; set; }

    public List<InvoiceLine> Lines { get; set; } = new();

    /// <summary>Concurrency token mapped to the Postgres <c>xmin</c> system column.</summary>
    public uint Version { get; set; }
}
