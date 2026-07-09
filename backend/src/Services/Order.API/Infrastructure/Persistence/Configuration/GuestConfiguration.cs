using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Order.API.Domain.Entities;

namespace Order.API.Infrastructure.Persistence.Configurations;

public class GuestConfiguration : IEntityTypeConfiguration<Guest>
{
    public void Configure(EntityTypeBuilder<Guest> builder)
    {
        builder.ToTable("Guests");
        builder.HasKey(g => g.Id);

        builder.Property(g => g.Name)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(g => g.TableId).IsRequired();
        builder.Property(g => g.CreatedAt).IsRequired();

        builder.Property(g => g.SessionId).IsRequired();
        builder.HasOne(g => g.Table)
            .WithMany(t => t.Guests)
            .HasForeignKey(g => g.TableId)
            .OnDelete(DeleteBehavior.Restrict); // Giữ lịch sử
    }
}