using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WarehouseApp.Core.Entities;

namespace WarehouseApp.Infrastructure.Data.Configurations;

public class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> b)
    {
        b.ToTable("account", t => t.ExcludeFromMigrations());
        b.HasKey(a => a.Id);
        b.HasIndex(a => a.Username).IsUnique();
    }
}

public class SmtpConfigConfiguration : IEntityTypeConfiguration<SmtpConfig>
{
    public void Configure(EntityTypeBuilder<SmtpConfig> b)
    {
        b.ToTable("smtp_config", t => t.ExcludeFromMigrations());
        b.HasKey(s => s.Id);
        b.Property(s => s.Id).ValueGeneratedNever(); // singleton (id = 1)
    }
}

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> b)
    {
        b.ToTable("audit_log", t => t.ExcludeFromMigrations());
        b.HasKey(a => a.Id);
        b.Property(a => a.Action).HasMaxLength(1);
        b.Property(a => a.OldValues).HasColumnType("jsonb");
        b.Property(a => a.NewValues).HasColumnType("jsonb");
        b.HasIndex(a => new { a.TableName, a.RecordId });
    }
}
