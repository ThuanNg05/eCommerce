namespace WarehouseApp.Core.Entities;

public class Material
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal ImportPrice { get; set; }
    public decimal SalePrice { get; set; }
    public int InStock { get; set; }
    public short Status { get; set; } = 1;
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
