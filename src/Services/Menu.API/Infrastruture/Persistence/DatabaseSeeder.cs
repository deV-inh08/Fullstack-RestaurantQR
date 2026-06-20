// src/Services/Menu.API/Infrastruture/MenuDbContext.cs  ← cùng thư mục với MenuDbContext

using Menu.API.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Menu.API.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(MenuDbContext db)
    {
        if (await db.Dishes.AnyAsync()) return;

        var dishes = new List<Dish>
        {
            // ── Món chính ──────────────────────────────────────────────────
            new() { Name = "Phở Bò Đặc Biệt",     Price = 85000,  Category = DishCategory.MainCourse, Status = DishStatus.Available,  Description = "Phở bò nước trong, tái chín gân gầu, nước dùng hầm 12 tiếng",   CreatedAt = DateTime.UtcNow },
            new() { Name = "Bún Bò Huế",            Price = 75000,  Category = DishCategory.MainCourse, Status = DishStatus.Available,  Description = "Bún bò cay đặc trưng miền Trung, chan huyết heo, chả cua",       CreatedAt = DateTime.UtcNow },
            new() { Name = "Cơm Tấm Sườn Bì Chả",  Price = 70000,  Category = DishCategory.MainCourse, Status = DishStatus.Available,  Description = "Cơm tấm Sài Gòn, sườn nướng mật ong, bì heo giòn, chả trứng",   CreatedAt = DateTime.UtcNow },
            new() { Name = "Bún Chả Hà Nội",        Price = 65000,  Category = DishCategory.MainCourse, Status = DishStatus.Available,  Description = "Chả miếng và chả viên nướng than hoa, nước mắm pha chua ngọt",  CreatedAt = DateTime.UtcNow },
            new() { Name = "Lẩu Thái Hải Sản",      Price = 280000, Category = DishCategory.MainCourse, Status = DishStatus.Available,  Description = "Lẩu Thái chua cay cho 2-3 người, tôm hùm đất, mực, cá, nghêu", CreatedAt = DateTime.UtcNow },
            new() { Name = "Mì Quảng Gà",           Price = 60000,  Category = DishCategory.MainCourse, Status = DishStatus.Available,  Description = "Mì Quảng Nam, thịt gà ta vàng ươm, trứng cút, bánh tráng",      CreatedAt = DateTime.UtcNow },
            new() { Name = "Cơm Chiên Dương Châu",  Price = 55000,  Category = DishCategory.MainCourse, Status = DishStatus.Available,  Description = "Cơm chiên trứng, tôm, lạp xưởng, cà rốt, đậu hà lan",          CreatedAt = DateTime.UtcNow },
            new() { Name = "Bánh Mì Thịt Nướng",    Price = 35000,  Category = DishCategory.MainCourse, Status = DishStatus.Available,  Description = "Bánh mì Sài Gòn giòn, thịt nướng sả ớt, pate gan, dưa leo",    CreatedAt = DateTime.UtcNow },

            // ── Tráng miệng ────────────────────────────────────────────────
            new() { Name = "Chè Thái Đặc Biệt",    Price = 35000, Category = DishCategory.Dessert, Status = DishStatus.Available,  Description = "Chè Thái 12 topping: thạch, trân châu, nata, sầu riêng, cốt dừa", CreatedAt = DateTime.UtcNow },
            new() { Name = "Bánh Flan Caramel",     Price = 25000, Category = DishCategory.Dessert, Status = DishStatus.Available,  Description = "Bánh flan mềm mịn, caramel đắng nhẹ",                              CreatedAt = DateTime.UtcNow },
            new() { Name = "Kem Dừa Non",           Price = 30000, Category = DishCategory.Dessert, Status = DishStatus.Available,  Description = "Kem dừa non thơm mát, thạch dừa giòn, đá bào mịn",                CreatedAt = DateTime.UtcNow },
            new() { Name = "Chè Đậu Đỏ Bánh Lọt",  Price = 28000, Category = DishCategory.Dessert, Status = DishStatus.OutOfStock, Description = "Chè đậu đỏ nước cốt dừa, bánh lọt lá dứa",                        CreatedAt = DateTime.UtcNow },

            // ── Nước uống ──────────────────────────────────────────────────
            new() { Name = "Nước Mía Tươi",         Price = 20000, Category = DishCategory.Beverage, Status = DishStatus.Available, Description = "Nước mía ép tươi tại chỗ, vắt tắc, đá lạnh",                     CreatedAt = DateTime.UtcNow },
            new() { Name = "Sinh Tố Bơ",            Price = 45000, Category = DishCategory.Beverage, Status = DishStatus.Available, Description = "Sinh tố bơ sáp 3 trái, sữa đặc, sữa tươi, đá bào",              CreatedAt = DateTime.UtcNow },
            new() { Name = "Trà Đào Cam Sả",        Price = 35000, Category = DishCategory.Beverage, Status = DishStatus.Available, Description = "Trà đào mát lạnh, cam tươi, sả bạc hà, trân châu trắng",         CreatedAt = DateTime.UtcNow },
            new() { Name = "Cà Phê Sữa Đá",        Price = 30000, Category = DishCategory.Beverage, Status = DishStatus.Available, Description = "Cà phê robusta pha phin, sữa đặc Ông Thọ, đá viên to",           CreatedAt = DateTime.UtcNow },
            new() { Name = "Nước Chanh Đường",      Price = 20000, Category = DishCategory.Beverage, Status = DishStatus.Available, Description = "Nước chanh vắt, đường thốt nốt, muối hoa, đá lạnh",             CreatedAt = DateTime.UtcNow },
            new() { Name = "Trà Tắc Gừng",          Price = 25000, Category = DishCategory.Beverage, Status = DishStatus.Available, Description = "Trà đen pha gừng tươi, nước cốt tắc, mật ong nguyên chất",      CreatedAt = DateTime.UtcNow },
        };

        db.Dishes.AddRange(dishes);
        await db.SaveChangesAsync();

        // Tạo snapshot đầu tiên cho mỗi món (bắt buộc — Order.API cần snapshotId)
        var snapshots = dishes.Select(d => new DishSnapshot
        {
            DishId = d.Id,
            Name = d.Name,
            Price = d.Price,
            Description = d.Description,
            Category = d.Category,
            ImagePath = d.ImagePath,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        db.DishSnapshots.AddRange(snapshots);
        await db.SaveChangesAsync();
    }
}