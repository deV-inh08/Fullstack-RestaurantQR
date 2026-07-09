using Menu.API.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Menu.API.Infrastructure.Persistence.Configurations;

public class DishSnapshotConfiguration : IEntityTypeConfiguration<DishSnapshot>
{
    public void Configure(EntityTypeBuilder<DishSnapshot> builder)
    {
        builder.ToTable("DishSnapshots");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Name)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(s => s.Price)
            .IsRequired();

        builder.Property(d => d.Description)
    .HasMaxLength(1000);
        builder.Property(d => d.Category).HasMaxLength(1000);

        builder.Property(d => d.ImagePath)
            .HasMaxLength(2048);

        builder.Property(s => s.DishId)
            .IsRequired();

        builder.Property(s => s.CreatedAt)
            .IsRequired();
    }
}