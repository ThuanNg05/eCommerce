namespace WarehouseApp.Core.Entities;

public class SubBackboard
{
    public long Id { get; set; }
    public string Size { get; set; } = string.Empty;
    public int InStock { get; set; }
    /// <summary>Minimum-stock threshold for reorder alerts: low when InStock &lt;= WarningStock.</summary>
    public int WarningStock { get; set; }
    public string? Description { get; set; }
    public short Status { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
