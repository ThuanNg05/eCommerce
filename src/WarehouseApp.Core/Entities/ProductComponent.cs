namespace WarehouseApp.Core.Entities;

/// <summary>
/// Per-product price composition (1:1 with <see cref="Product"/>). A null Val&lt;X&gt;
/// means that component is not part of the product. <see cref="Wage"/> is the labor cost.
/// Multiplied against the SubPrice rate card to compute the product's base price.
/// </summary>
public class ProductComponent
{
    public long Id { get; set; }
    public long ProductId { get; set; }
    public decimal Wage { get; set; }
    public decimal? ValKieng { get; set; }
    public decimal? ValNhL { get; set; }
    public decimal? ValNhN { get; set; }
    public decimal? ValGL { get; set; }
    public decimal? ValGN { get; set; }
    public decimal? ValDL { get; set; }
    public decimal? ValBack { get; set; }
    public decimal? ValLua { get; set; }
    public decimal? ValKT { get; set; }
    public decimal? ValOc { get; set; }
    public decimal? ValNhom { get; set; }
    public decimal? Val7F { get; set; }
    public decimal? Val2D { get; set; }
    public decimal? ValDecal { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Product? Product { get; set; }
}
