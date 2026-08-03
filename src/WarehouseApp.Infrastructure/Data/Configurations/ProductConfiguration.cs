using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WarehouseApp.Core.Entities;

namespace WarehouseApp.Infrastructure.Data.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> b)
    {
        b.HasKey(p => p.Id);

        b.Property(p => p.Sku).HasMaxLength(64).IsRequired();
        b.HasIndex(p => p.Sku).IsUnique();

        b.Property(p => p.Name).HasMaxLength(256).IsRequired();
        b.Property(p => p.Description).HasMaxLength(1024);
        b.Property(p => p.UnitPrice).HasColumnType("numeric(18,2)");
        b.Property(p => p.QuantityOnHand).IsRequired();
        b.Property(p => p.ReorderLevel).IsRequired();

        // Optimistic concurrency via the Postgres system column xmin. A uint
        // row-version property is mapped by Npgsql to xmin — no extra column is
        // created; EF compares the row version on UPDATE/DELETE.
        b.Property(p => p.Version).IsRowVersion();

        b.HasIndex(p => p.QuantityOnHand); // supports low-stock scans
    }
}
