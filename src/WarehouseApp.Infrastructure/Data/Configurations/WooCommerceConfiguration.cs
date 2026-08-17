using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WarehouseApp.Core.Entities;

namespace WarehouseApp.Infrastructure.Data.Configurations;

public class WooCommerceProductLinkConfiguration : IEntityTypeConfiguration<WooCommerceProductLink>
{
    public void Configure(EntityTypeBuilder<WooCommerceProductLink> b)
    {
        b.ToTable("woocommerce_product_link", t => t.ExcludeFromMigrations());
        b.HasKey(x => x.ProductId);
        // PostgreSQL schema keeps "woocommerce" as one word. The default EF
        // snake_case convention would incorrectly produce woo_commerce_*.
        b.Property(x => x.WooCommerceProductId).HasColumnName("woocommerce_product_id");
        b.Property(x => x.WooCommerceVariationId).HasColumnName("woocommerce_variation_id");
        b.HasIndex(x => new { x.WooCommerceProductId, x.WooCommerceVariationId }).IsUnique();
        b.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class WooCommerceOrderConfiguration : IEntityTypeConfiguration<WooCommerceOrder>
{
    public void Configure(EntityTypeBuilder<WooCommerceOrder> b)
    {
        b.ToTable("woocommerce_order", t => t.ExcludeFromMigrations());
        b.HasKey(x => x.WooCommerceOrderId);
        b.Property(x => x.WooCommerceOrderId).HasColumnName("woocommerce_order_id");
        b.Property(x => x.OrderNumber).HasMaxLength(64);
        b.Property(x => x.Status).HasMaxLength(32);
        b.Property(x => x.Currency).HasMaxLength(8);
        b.Property(x => x.CustomerName).HasMaxLength(255);
        b.Property(x => x.CustomerEmail).HasMaxLength(255);
        b.Property(x => x.CustomerPhone).HasMaxLength(50);
        b.Property(x => x.ShippingAddress).HasMaxLength(1000);
        b.Property(x => x.ConfirmedInvoiceId).HasMaxLength(20);
        b.HasIndex(x => new { x.Status, x.SourceUpdatedAt });
        b.HasOne(x => x.ConfirmedInvoice).WithMany().HasForeignKey(x => x.ConfirmedInvoiceId).OnDelete(DeleteBehavior.Restrict);
        b.HasMany(x => x.Items).WithOne(x => x.Order!).HasForeignKey(x => x.WooCommerceOrderId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class WooCommerceOrderItemConfiguration : IEntityTypeConfiguration<WooCommerceOrderItem>
{
    public void Configure(EntityTypeBuilder<WooCommerceOrderItem> b)
    {
        b.ToTable("woocommerce_order_item", t => t.ExcludeFromMigrations());
        b.HasKey(x => x.WooCommerceOrderItemId);
        b.Property(x => x.WooCommerceOrderItemId).HasColumnName("woocommerce_order_item_id");
        b.Property(x => x.WooCommerceOrderId).HasColumnName("woocommerce_order_id");
        b.Property(x => x.WooCommerceProductId).HasColumnName("woocommerce_product_id");
        b.Property(x => x.WooCommerceVariationId).HasColumnName("woocommerce_variation_id");
        b.Property(x => x.ProductName).HasMaxLength(255);
        b.HasIndex(x => x.WooCommerceOrderId);
        b.HasIndex(x => x.ProductId);
        b.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
    }
}
