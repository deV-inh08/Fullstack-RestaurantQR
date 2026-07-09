using Identity.API.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identity.API.Infrastructure.Persistence.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens");
        builder.HasKey(rt => rt.Token);

        builder.Property(rt => rt.Token)
            .IsRequired()
            .HasMaxLength(512);

        builder.HasIndex(rt => rt.Token);
        builder.HasIndex(rt => rt.ExpiresAt);

        builder.Property(rt => rt.AccountId).IsRequired();
        builder.Property(rt => rt.ExpiresAt).IsRequired();
        builder.Property(rt => rt.CreatedAt).IsRequired();

        builder.HasOne(rt => rt.Account)
            .WithMany(a => a.RefreshTokens)
            .HasForeignKey(rt => rt.AccountId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
