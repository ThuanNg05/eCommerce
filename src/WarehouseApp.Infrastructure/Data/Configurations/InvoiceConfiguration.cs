using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WarehouseApp.Core.Entities;

namespace WarehouseApp.Infrastructure.Data.Configurations;

public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> b)
    {
        b.HasKey(i => i.Id);

        b.Property(i => i.Number).HasMaxLength(32).IsRequired();
        b.HasIndex(i => i.Number).IsUnique();

        b.Property(i => i.CustomerName).HasMaxLength(256).IsRequired();
        b.Property(i => i.Status).HasConversion<int>();

        b.Property(i => i.Subtotal).HasColumnType("numeric(18,2)");
        b.Property(i => i.TaxRate).HasColumnType("numeric(6,4)");
        b.Property(i => i.TaxAmount).HasColumnType("numeric(18,2)");
        b.Property(i => i.Total).HasColumnType("numeric(18,2)");

        b.HasMany(i => i.Lines)
            .WithOne(l => l.Invoice!)
            .HasForeignKey(l => l.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(i => i.CreatedAt);

        // Optimistic concurrency mapped to the Postgres xmin system column.
        b.Property(i => i.Version).IsRowVersion();
    }
}
