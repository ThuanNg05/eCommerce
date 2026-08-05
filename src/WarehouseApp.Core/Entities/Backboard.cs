namespace WarehouseApp.Core.Entities;

public class Backboard
{
    public long Id { get; set; }
    public short Type { get; set; }
    public decimal ImportPrice { get; set; }
    public decimal? SalePrice { get; set; }
    public int InStock { get; set; }
    /// <summary>Minimum-stock threshold for reorder alerts: low when InStock &lt;= WarningStock.</summary>
    public int WarningStock { get; set; }
    public short Status { get; set; } = 1;
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
