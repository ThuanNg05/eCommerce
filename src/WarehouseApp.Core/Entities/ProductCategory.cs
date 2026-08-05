namespace WarehouseApp.Core.Entities;

/// <summary>Join row linking a <see cref="Product"/> to a <see cref="Category"/>
/// (many-to-many). Composite primary key (ProductId, CategoryId).</summary>
public class ProductCategory
{
    public long ProductId { get; set; }
    public long CategoryId { get; set; }
}
