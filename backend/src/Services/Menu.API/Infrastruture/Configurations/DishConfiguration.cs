using Menu.API.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Menu.API.Infrastructure.Persistence.Configurations;

public class DishConfiguration : IEntityTypeConfiguration<Dish>
{
    public void Configure(EntityTypeBuilder<Dish> builder)
    {
        builder.ToTable("Dishes");
        builder.HasKey(d => d.Id);

        builder.Property(d => d.Name)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(d => d.Price)
            .IsRequired();

        builder.Property(d => d.Description)
    .HasMaxLength(1000);

        builder.Property(d => d.ImagePath)
            .HasMaxLength(2048);

        builder.Property(d => d.Category).HasMaxLength(1000);

        builder.Property(d => d.Status)
            .IsRequired()
            .HasMaxLength(20)
            .HasConversion<string>();

        builder.Property(d => d.CreatedAt)
            .IsRequired();

        // Một Dish có nhiều DishSnapshot (snapshot lịch sử giá/tên)
        builder.HasMany(d => d.Snapshots)
     .WithOne(s => s.Dish)           // khớp với property Dish? trong DishSnapshot
     .HasForeignKey(s => s.DishId)
     .OnDelete(DeleteBehavior.Cascade);

    }
}