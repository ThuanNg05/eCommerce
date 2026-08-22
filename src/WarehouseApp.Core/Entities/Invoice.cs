namespace WarehouseApp.Core.Entities;

/// <summary>
/// A sales invoice (FR014–FR016). The <see cref="Id"/> is an application-generated
/// business code (varchar), not a surrogate. Guarded by an optimistic-concurrency token
/// (Postgres <c>xmin</c>).
/// </summary>
public class Invoice
{
    public string Id { get; set; } = string.Empty;
    public long CustomerId { get; set; }
    public decimal Total { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    /// <summary>Unpredictable bearer token used only by the public read-only lookup endpoint.</summary>
    public string? PublicLookupToken { get; set; }
    /// <summary>Short customer-facing code used with the phone suffix lookup.</summary>
    public string? PublicLookupCode { get; set; }

    public Customer? Customer { get; set; }
    public List<InvoiceDetail> Details { get; set; } = new();

    /// <summary>Concurrency token mapped to the Postgres <c>xmin</c> system column.</summary>
    public uint Version { get; set; }
}
