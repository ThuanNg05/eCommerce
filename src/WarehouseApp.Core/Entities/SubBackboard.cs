namespace WarehouseApp.Core.Entities;

public class SubBackboard
{
    public long Id { get; set; }
    public string Size { get; set; } = string.Empty;
    public int InStock { get; set; }
    public string? Description { get; set; }
    public short Status { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
