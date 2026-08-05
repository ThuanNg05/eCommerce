namespace WarehouseApp.Core.Entities;

/// <summary>A customer that invoices are billed to. <see cref="GroupPrice"/> is a
/// single-character pricing-tier code.</summary>
public class Customer
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Email { get; set; }
    public string? GroupPrice { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
