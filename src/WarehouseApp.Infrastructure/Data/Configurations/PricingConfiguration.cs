using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WarehouseApp.Core.Entities;

namespace WarehouseApp.Infrastructure.Data.Configurations;

public class SubPriceConfiguration : IEntityTypeConfiguration<SubPrice>
{
    public void Configure(EntityTypeBuilder<SubPrice> b)
    {
        b.ToTable("sub_price", t => t.ExcludeFromMigrations());
        b.HasKey(s => s.Id);
        // Singleton rate card (id = 1); the app never inserts, it updates the seeded row.
        b.Property(s => s.Id).ValueGeneratedNever();
    }
}

public class ProductComponentConfiguration : IEntityTypeConfiguration<ProductComponent>
{
    public void Configure(EntityTypeBuilder<ProductComponent> b)
    {
        b.ToTable("product_component", t => t.ExcludeFromMigrations());
        b.HasKey(pc => pc.Id);
        // 1:1 with Product.
        b.HasIndex(pc => pc.ProductId).IsUnique();
        b.Property(pc => pc.ValKieng).HasPrecision(10, 3);
        b.Property(pc => pc.ValNhL).HasPrecision(10, 3);
        b.Property(pc => pc.ValNhN).HasPrecision(10, 3);
        b.Property(pc => pc.ValGL).HasPrecision(10, 3);
        b.Property(pc => pc.ValGN).HasPrecision(10, 3);
        b.Property(pc => pc.ValDL).HasPrecision(10, 3);
        b.Property(pc => pc.ValBack).HasPrecision(10, 3);
        b.Property(pc => pc.ValLua).HasPrecision(10, 3);
        b.Property(pc => pc.ValKT).HasPrecision(10, 3);
        b.Property(pc => pc.ValOc).HasPrecision(10, 3);
        b.Property(pc => pc.ValNhom).HasPrecision(10, 3);
        b.Property(pc => pc.Val7F).HasPrecision(10, 3);
        b.Property(pc => pc.Val2D).HasPrecision(10, 3);
        b.Property(pc => pc.ValDecal).HasPrecision(10, 3);
    }
}
