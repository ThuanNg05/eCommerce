using Microsoft.EntityFrameworkCore;
using WarehouseApp.Core.Entities;

namespace WarehouseApp.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<Backboard> Backboards => Set<Backboard>();
    public DbSet<SubBackboard> SubBackboards => Set<SubBackboard>();
    public DbSet<Frame> Frames => Set<Frame>();
    public DbSet<FrameDetail> FrameDetails => Set<FrameDetail>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductCategory> ProductCategories => Set<ProductCategory>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();
    public DbSet<InventoryTransactionDetail> InventoryTransactionDetails => Set<InventoryTransactionDetail>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceDetail> InvoiceDetails => Set<InvoiceDetail>();
    public DbSet<SmtpConfig> SmtpConfigs => Set<SmtpConfig>();
    public DbSet<SubPrice> SubPrices => Set<SubPrice>();
    public DbSet<ProductComponent> ProductComponents => Set<ProductComponent>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // The schema is owned by Supabase (raw SQL), not EF migrations, so exact precision
        // only affects model validation warnings, not DDL. A single sensible default keeps
        // money columns clean; per-column overrides live in the entity configurations.
        configurationBuilder.Properties<decimal>().HavePrecision(18, 3);
    }
}
