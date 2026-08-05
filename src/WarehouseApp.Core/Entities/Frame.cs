namespace WarehouseApp.Core.Entities;

public class Frame
{
    public long Id { get; set; }
    public int Code { get; set; }
    public string? Description { get; set; }
    public short Status { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
