// src/Services/Menu.API/API/Controllers/DishSnapshotController.cs
using Menu.API.Application.DTOs;
using Menu.API.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Menu.API.API.Controllers;

[ApiController]
[Route("api/v1/dish-snapshot")]
public class DishSnapshotController : ControllerBase
{
    private readonly MenuDbContext _db;

    public DishSnapshotController(MenuDbContext db) => _db = db;

    /// <summary>
    /// Internal — called by Order.API (service-to-service) when creating an order.
    /// AllowAnonymous vì Order.API gọi không mang user JWT.
    /// </summary>
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var snapshot = await _db.DishSnapshots
            .FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new KeyNotFoundException($"DishSnapshot {id} not found");

        return Ok(new
        {
            message = "Lấy snapshot thành công",
            data = new DishSnapshotDto(
                snapshot.Id,
                snapshot.Name,
                snapshot.Price,
                snapshot.Description,
                snapshot.Category.ToString(),
                snapshot.ImagePath,
                snapshot.DishId,
                snapshot.CreatedAt)
        });
    }

    /// <summary>
    /// Lấy snapshot mới nhất của một dish — dùng khi FE cần hiển thị
    /// thông tin món trước khi order (lấy snapshotId để gửi lên CreateOrderRequest).
    /// GET /api/v1/dish-snapshot/by-dish/{dishId}
    /// </summary>
    [HttpGet("by-dish/{dishId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetLatestByDish(int dishId)
    {
        var snapshot = await _db.DishSnapshots
            .Where(s => s.DishId == dishId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"No snapshot found for dish {dishId}");

        return Ok(new
        {
            message = "Lấy snapshot thành công",
            data = new DishSnapshotDto(
                snapshot.Id,
                snapshot.Name,
                snapshot.Price,
                snapshot.Description,
                snapshot.Category.ToString(),
                snapshot.ImagePath,
                snapshot.DishId,
                snapshot.CreatedAt)
        });
    }
}