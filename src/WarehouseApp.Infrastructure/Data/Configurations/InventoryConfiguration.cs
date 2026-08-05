using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WarehouseApp.Core.Entities;

namespace WarehouseApp.Infrastructure.Data.Configurations;

public class InventoryTransactionConfiguration : IEntityTypeConfiguration<InventoryTransaction>
{
    public void Configure(EntityTypeBuilder<InventoryTransaction> b)
    {
        b.ToTable("inventory_transaction", t => t.ExcludeFromMigrations());
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.TransactionCode).IsUnique();

        b.HasMany(x => x.Details)
            .WithOne(d => d.Transaction!)
            .HasForeignKey(d => d.InventoryTransactionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class InventoryTransactionDetailConfiguration : IEntityTypeConfiguration<InventoryTransactionDetail>
{
    public void Configure(EntityTypeBuilder<InventoryTransactionDetail> b)
    {
        b.ToTable("inventory_transaction_detail", t => t.ExcludeFromMigrations());
        b.HasKey(x => x.Id);
    }
}
