using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WarehouseApp.Core.Entities;

namespace WarehouseApp.Infrastructure.Data.Configurations;

// Every table is owned by Supabase SQL, so all mappings use ExcludeFromMigrations():
// EF reads/writes the tables but never emits DDL for them. Column names come from the
// snake_case naming convention (configured in DI); table names are set singular here.

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> b)
    {
        b.ToTable("product", t => t.ExcludeFromMigrations());
        b.HasKey(p => p.Id);
        b.HasIndex(p => p.Sku).IsUnique();
        b.Property(p => p.PriceRetail).HasPrecision(18, 0);
        b.Property(p => p.PriceWholesale).HasPrecision(18, 0);
        b.Property(p => p.ImageUrl).HasMaxLength(512);
        // Optimistic concurrency via the Postgres xmin system column (no stored column).
        b.Property(p => p.Version).IsRowVersion();
        b.HasIndex(p => p.InStock); // supports low-stock scans
    }
}

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> b)
    {
        b.ToTable("category", t => t.ExcludeFromMigrations());
        b.HasKey(c => c.Id);
        b.HasIndex(c => c.Name).IsUnique();
    }
}

public class ProductCategoryConfiguration : IEntityTypeConfiguration<ProductCategory>
{
    public void Configure(EntityTypeBuilder<ProductCategory> b)
    {
        b.ToTable("product_category", t => t.ExcludeFromMigrations());
        b.HasKey(pc => new { pc.ProductId, pc.CategoryId });
    }
}

public class MaterialConfiguration : IEntityTypeConfiguration<Material>
{
    public void Configure(EntityTypeBuilder<Material> b)
    {
        b.ToTable("material", t => t.ExcludeFromMigrations());
        b.HasKey(m => m.Id);
        b.HasIndex(m => m.Name).IsUnique();
    }
}

public class BackboardConfiguration : IEntityTypeConfiguration<Backboard>
{
    public void Configure(EntityTypeBuilder<Backboard> b)
    {
        b.ToTable("backboard", t => t.ExcludeFromMigrations());
        b.HasKey(x => x.Id);
    }
}

public class SubBackboardConfiguration : IEntityTypeConfiguration<SubBackboard>
{
    public void Configure(EntityTypeBuilder<SubBackboard> b)
    {
        b.ToTable("sub_backboard", t => t.ExcludeFromMigrations());
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.Size).IsUnique();
    }
}
