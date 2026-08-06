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
        // Snake-case convention renders Pr7F/Pr2D as pr7f/pr2d, but the DB columns keep the
        // underscore before the digit (pr_7f/pr_2d); map those two explicitly.
        b.Property(s => s.Pr7F).HasColumnName("pr_7f");
        b.Property(s => s.Pr2D).HasColumnName("pr_2d");
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
        // Same digit-column mismatch as sub_price: force the underscore-before-digit names.
        b.Property(pc => pc.Val7F).HasPrecision(10, 3).HasColumnName("val_7f");
        b.Property(pc => pc.Val2D).HasPrecision(10, 3).HasColumnName("val_2d");
        b.Property(pc => pc.ValDecal).HasPrecision(10, 3);
    }
}
