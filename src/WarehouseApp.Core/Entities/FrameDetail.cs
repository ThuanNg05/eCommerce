namespace WarehouseApp.Core.Entities;

/// <summary>Bill-of-materials line: a sub-backboard that composes a <see cref="Frame"/>.</summary>
public class FrameDetail
{
    public long Id { get; set; }
    public long FrameId { get; set; }
    public long SubBackboardId { get; set; }
    public int Quantity { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
