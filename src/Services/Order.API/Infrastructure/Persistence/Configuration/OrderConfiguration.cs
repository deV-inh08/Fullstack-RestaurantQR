using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Order.API.Infrastructure.Persistence.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order.API.Domain.Entities.Order>
{
    public void Configure(EntityTypeBuilder<Order.API.Domain.Entities.Order> builder)
    {
        builder.ToTable("Orders");
        builder.HasKey(o => o.Id);

        builder.Property(o => o.GuestId).IsRequired();
        builder.Property(o => o.TableId).IsRequired();
        builder.Property(o => o.DishSnapshotId).IsRequired();
        builder.Property(o => o.Quantity).IsRequired();

        builder.Property(o => o.Status)
            .IsRequired()
            .HasMaxLength(20)
            .HasConversion<string>();

        builder.HasIndex(o => o.TableId);
        builder.HasIndex(o => o.GuestId);
        builder.HasIndex(o => o.Status);

        builder.Property(o => o.CreatedAt).IsRequired();
        builder.Property(o => o.UpdatedAt).IsRequired();

        builder.HasOne(o => o.Guest)
            .WithMany(g => g.Orders)
            .HasForeignKey(o => o.GuestId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(o => o.Table)
            .WithMany(t => t.Orders)
            .HasForeignKey(o => o.TableId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}