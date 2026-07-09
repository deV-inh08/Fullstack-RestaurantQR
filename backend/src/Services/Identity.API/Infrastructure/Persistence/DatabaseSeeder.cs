

using Identity.API.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Identity.API.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(IdentityDbContext db)
    {
        if (await db.Accounts.AnyAsync()) return;
        var accounts = new List<Account>
        {
            new()
            {
                Name = "Super Admin",
                Email = "superadmin1@restaurant.com",
                Role = UserRole.SuperAdmin,
                Password = BCrypt.Net.BCrypt.HashPassword("SuperAdmin1@123678"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            },
            new() {
                Name      = "Trần Thị Mai",
                Email     = "admin1@nhahang.vn",
                Password  = BCrypt.Net.BCrypt.HashPassword("Admin@123456", 12),
                Role      = UserRole.Admin,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new() {
                Name      = "Lê Văn Phúc",
                Email     = "admin2@nhahang.vn",
                Password  = BCrypt.Net.BCrypt.HashPassword("Admin@123456", 12),
                Role      = UserRole.Admin,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new() {
                Name      = "Phạm Thị Lan",
                Email     = "staff1@nhahang.vn",
                Password  = BCrypt.Net.BCrypt.HashPassword("Staff@123456", 12),
                Role      = UserRole.Staff,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new() {
                Name      = "Đỗ Văn Tuấn",
                Email     = "staff2@nhahang.vn",
                Password  = BCrypt.Net.BCrypt.HashPassword("Staff@123456", 12),
                Role      = UserRole.Staff,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new() {
                Name      = "Nguyễn Thị Hoa",
                Email     = "staff3@nhahang.vn",
                Password  = BCrypt.Net.BCrypt.HashPassword("Staff@123456", 12),
                Role      = UserRole.Staff,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new() {
                Name      = "Hoàng Văn Nam",
                Email     = "staff4@nhahang.vn",
                Password  = BCrypt.Net.BCrypt.HashPassword("Staff@123456", 12),
                Role      = UserRole.Staff,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
        };

        db.Accounts.AddRange(accounts);
        await db.SaveChangesAsync();
    }
}