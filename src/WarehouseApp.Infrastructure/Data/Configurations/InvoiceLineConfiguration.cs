using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WarehouseApp.Core.Entities;

namespace WarehouseApp.Infrastructure.Data.Configurations;

public class InvoiceLineConfiguration : IEntityTypeConfiguration<InvoiceLine>
{
    public void Configure(EntityTypeBuilder<InvoiceLine> b)
    {
        b.HasKey(l => l.Id);

        b.Property(l => l.Sku).HasMaxLength(64).IsRequired();
        b.Property(l => l.Description).HasMaxLength(512).IsRequired();
        b.Property(l => l.UnitPrice).HasColumnType("numeric(18,2)");
        b.Property(l => l.LineTotal).HasColumnType("numeric(18,2)");

        // Restrict so a product referenced by historical invoice lines can't be
        // hard-deleted out from under them.
        b.HasOne(l => l.Product)
            .WithMany()
            .HasForeignKey(l => l.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(l => l.ProductId);
    }
}
