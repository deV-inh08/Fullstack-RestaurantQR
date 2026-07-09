using Identity.API.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identity.API.Infrastructure.Persistence.Configurations;

public class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.ToTable("Accounts");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Name)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(a => a.Email)
            .IsRequired()
            .HasMaxLength(256);

        builder.HasIndex(a => a.Email).IsUnique();

        builder.Property(a => a.Password)
            .IsRequired()
            .HasMaxLength(512);

        builder.Property(a => a.Avatar)
            .HasMaxLength(2048);

        builder.Property(a => a.Role)
            .IsRequired()
            .HasMaxLength(20)
            .HasConversion<string>();

        builder.Property(a => a.CreatedAt)
            .IsRequired();

        builder.Property(a => a.UpdatedAt)
            .IsRequired();
    }
}
