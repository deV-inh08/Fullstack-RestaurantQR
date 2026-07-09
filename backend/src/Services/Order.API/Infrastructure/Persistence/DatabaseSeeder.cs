// ĐẶT FILE NÀY TẠI:
// src/Services/Order.API/Infrastructure/Persistence/DatabaseSeeder.cs

using Microsoft.EntityFrameworkCore;
using Order.API.Domain.Entities;

namespace Order.API.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(OrderDbContext db)
    {
        if (await db.Tables.AnyAsync()) return;

        var tables = new List<Table>
        {
            new() { Number = 1,  Capacity = 2,  Status = TableStatus.Available, IsVisibleOnReservation = true,  SessionId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Number = 2,  Capacity = 2,  Status = TableStatus.Available, IsVisibleOnReservation = true,  SessionId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Number = 3,  Capacity = 4,  Status = TableStatus.Available, IsVisibleOnReservation = true,  SessionId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Number = 4,  Capacity = 4,  Status = TableStatus.Available, IsVisibleOnReservation = true,  SessionId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Number = 5,  Capacity = 6,  Status = TableStatus.Available, IsVisibleOnReservation = true,  SessionId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Number = 6,  Capacity = 6,  Status = TableStatus.Available, IsVisibleOnReservation = true,  SessionId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Number = 7,  Capacity = 8,  Status = TableStatus.Available, IsVisibleOnReservation = true,  SessionId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Number = 8,  Capacity = 8,  Status = TableStatus.Hidden,    IsVisibleOnReservation = false, SessionId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Number = 9,  Capacity = 10, Status = TableStatus.Available, IsVisibleOnReservation = true,  SessionId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new() { Number = 10, Capacity = 12, Status = TableStatus.Available, IsVisibleOnReservation = false, SessionId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
        };

        db.Tables.AddRange(tables);
        await db.SaveChangesAsync();
    }
}