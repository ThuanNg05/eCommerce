using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WarehouseApp.Core.Entities;

namespace WarehouseApp.Infrastructure.Data.Configurations;

public class FrameConfiguration : IEntityTypeConfiguration<Frame>
{
    public void Configure(EntityTypeBuilder<Frame> b)
    {
        b.ToTable("frame", t => t.ExcludeFromMigrations());
        b.HasKey(f => f.Id);
        b.HasIndex(f => f.Code).IsUnique();
    }
}

public class FrameDetailConfiguration : IEntityTypeConfiguration<FrameDetail>
{
    public void Configure(EntityTypeBuilder<FrameDetail> b)
    {
        b.ToTable("frame_detail", t => t.ExcludeFromMigrations());
        b.HasKey(fd => fd.Id);
    }
}
