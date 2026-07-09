using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Order.API.Domain.Entities;

namespace Order.API.Infrastructure.Persistence.Configurations;

public class BillConfiguration : IEntityTypeConfiguration<Bill>
{
    public void Configure(EntityTypeBuilder<Bill> builder)
    {
        builder.ToTable("Bills");
        builder.HasKey(b => b.Id);

        builder.Property(b => b.TableId).IsRequired();

        // SessionId — snapshot của Table.SessionId lúc bill được tạo
        // Dùng để aggregate đúng orders trong session hiện tại
        builder.Property(b => b.SessionId).IsRequired();
        builder.HasIndex(b => b.SessionId); // Query theo session thường xuyên

        builder.Property(b => b.GuestName)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(b => b.TotalAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        // Status stored as int (enum) — Unpaid=1, Requested=2, Paid=3
        builder.Property(b => b.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(b => b.AccountId); // nullable — null khi chưa thanh toán

        builder.Property(b => b.CreatedAt).IsRequired();
        builder.Property(b => b.UpdatedAt).IsRequired();

        // Index cho query "tìm bill theo bàn + session"
        builder.HasIndex(b => new { b.TableId, b.SessionId });

        // FK → Table (Cascade: xóa bàn → xóa bills)
        builder.HasOne(b => b.Table)
            .WithMany()
            .HasForeignKey(b => b.TableId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}