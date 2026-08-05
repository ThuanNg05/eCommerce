namespace WarehouseApp.Core.Entities;

/// <summary>
/// Singleton rate card (Id = 1) holding the current unit price of each component type.
/// Combined with a product's <see cref="ProductComponent"/> values to compute base price:
/// <c>BasePrice = Wage + Σ (Pr&lt;X&gt; * coalesce(Val&lt;X&gt;, 0))</c>.
/// </summary>
public class SubPrice
{
    public short Id { get; set; } = 1;
    public decimal PrKieng { get; set; }
    public decimal PrNhL { get; set; }
    public decimal PrNhN { get; set; }
    public decimal PrGL { get; set; }
    public decimal PrGN { get; set; }
    public decimal PrDL { get; set; }
    public decimal PrBack { get; set; }
    public decimal PrLua { get; set; }
    public decimal PrKT { get; set; }
    public decimal PrOc { get; set; }
    public decimal PrNhom { get; set; }
    public decimal Pr7F { get; set; }
    public decimal Pr2D { get; set; }
    public decimal PrDecal { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
