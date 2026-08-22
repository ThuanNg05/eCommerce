using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WarehouseApp.Core.Entities;

namespace WarehouseApp.Infrastructure.Data.Configurations;

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> b)
    {
        b.ToTable("customer", t => t.ExcludeFromMigrations());
        b.HasKey(c => c.Id);
        b.HasIndex(c => c.Name).IsUnique();
        b.HasIndex(c => c.Phone).IsUnique();
        b.HasIndex(c => c.Email).IsUnique();
        b.Property(c => c.GroupPrice).HasMaxLength(1);
    }
}

public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> b)
    {
        b.ToTable("invoice", t => t.ExcludeFromMigrations());
        b.HasKey(i => i.Id);
        // Business code supplied by the application, not a store-generated surrogate.
        b.Property(i => i.Id).HasMaxLength(20).ValueGeneratedNever();
        b.Property(i => i.PublicLookupToken).HasMaxLength(64);

        b.HasOne(i => i.Customer)
            .WithMany()
            .HasForeignKey(i => i.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasMany(i => i.Details)
            .WithOne(d => d.Invoice!)
            .HasForeignKey(d => d.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(i => i.CreatedAt);
        b.HasIndex(i => i.PublicLookupToken).IsUnique().HasFilter("public_lookup_token is not null");
        b.Property(i => i.PublicLookupCode).HasMaxLength(8);
        b.HasIndex(i => i.PublicLookupCode).IsUnique().HasFilter("public_lookup_code is not null");

        // Optimistic concurrency mapped to the Postgres xmin system column.
        b.Property(i => i.Version).IsRowVersion();
    }
}

public class InvoiceDetailConfiguration : IEntityTypeConfiguration<InvoiceDetail>
{
    public void Configure(EntityTypeBuilder<InvoiceDetail> b)
    {
        b.ToTable("invoice_detail", t => t.ExcludeFromMigrations());
        b.HasKey(d => new { d.InvoiceId, d.ProductId });
        b.Property(d => d.InvoiceId).HasMaxLength(20);
    }
}
