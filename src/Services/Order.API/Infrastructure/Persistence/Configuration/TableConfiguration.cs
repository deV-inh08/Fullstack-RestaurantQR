using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Order.API.Domain.Entities;

namespace Order.API.Infrastructure.Persistence.Configurations;

public class TableConfiguration : IEntityTypeConfiguration<Table>
{
    public void Configure(EntityTypeBuilder<Table> builder)
    {
        builder.ToTable("Tables");
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Number).IsRequired();
        builder.HasIndex(t => t.Number).IsUnique();

        builder.Property(t => t.Capacity).IsRequired();

        builder.Property(t => t.Status)
            .IsRequired()
            .HasMaxLength(20)
            .HasConversion<string>();

        builder.Property(t => t.IsVisibleOnReservation).IsRequired();
        builder.Property(t => t.SessionId).IsRequired();
        builder.Property(t => t.CreatedAt).IsRequired();
        builder.Property(t => t.UpdatedAt).IsRequired();
    }
}