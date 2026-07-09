using Menu.API.Application.DTOs;
using Menu.API.Domain.Entities;
using Menu.API.Infrastructure.Persistence;
using Menu.API.Infrastruture.Utils;
using Microsoft.EntityFrameworkCore;
using Shared.DTOs;

namespace Menu.API.Application.Services;

public class MenuService
{
    private readonly MenuDbContext _db;
    private readonly IFileUploadUtil _fileUploadUtil;

    public MenuService(MenuDbContext db, IFileUploadUtil fileUploadUtil)
    {
        _db = db;
        _fileUploadUtil = fileUploadUtil;
    }

    // ─── Query ────────────────────────────────────────

    public async Task<PaginatedResponse<DishDto>> GetAllAsync(PaginationParams p)
    {
        var query = _db.Dishes.OrderByDescending(d => d.CreatedAt);
        var total = await query.CountAsync();
        var items = await query
            .Skip(p.Skip)
            .Take(p.Take)
            .ToListAsync();

        return new PaginatedResponse<DishDto>(items.Select(ToDto), total, p.Page, p.Take);
    }

    public async Task<DishDto> GetByIdAsync(int id)
    {
        var dish = await _db.Dishes.FindAsync(id)
            ?? throw new KeyNotFoundException("Dish not found");

        return ToDto(dish);
    }

    // ─── Mutations ────────────────────────────────────

    public async Task<DishDto> CreateAsync(CreateDishRequest request)
    {
        if (request.Price <= 0)
            throw new ArgumentException("Dish price must be greater than 0");

        // Save image file if provided
        string? imagePath = null;
        if (request.Image != null)
        {
            imagePath = await _fileUploadUtil.SaveFileAsync(request.Image);
        }

        var dish = new Dish
        {
            Name = request.Name.Trim(),
            Price = (int)request.Price,
            ImagePath = imagePath,
            Category = request.Category,
            Description = request.Description,
            Status = DishStatus.Available,
            CreatedAt = DateTime.UtcNow
        };

        _db.Dishes.Add(dish);
        await _db.SaveChangesAsync();

        // Tạo snapshot đầu tiên ngay khi tạo món
        _db.DishSnapshots.Add(new DishSnapshot
        {
            DishId = dish.Id,
            Name = dish.Name,
            Price = dish.Price,
            ImagePath = imagePath,
            Description = dish.Description,
            Category = dish.Category,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return ToDto(dish);
    }

    public async Task<DishDto> UpdateAsync(int id, UpdateDishRequest request)
    {
        var dish = await _db.Dishes.FindAsync(id)
            ?? throw new KeyNotFoundException("Dish not found");

        if (request.Price <= 0)
            throw new ArgumentException("Dish price must be greater than 0");

        // Snapshot old values when key fields change
        if (dish.Price != request.Price || dish.Name != request.Name.Trim() || dish.Category != request.Category)
        {
            _db.DishSnapshots.Add(new DishSnapshot
            {
                DishId = dish.Id,
                Name = dish.Name,
                ImagePath = dish.ImagePath,
                Category = dish.Category,
                Description = dish.Description,
                Price = dish.Price,
                CreatedAt = DateTime.UtcNow
            });
        }

        dish.Name = request.Name.Trim();
        dish.Price = request.Price;
        dish.Category = request.Category;
        dish.Description = request.Description;

        // ← Handle new image upload; keep existing if no new file provided
        if (request.Image != null)
        {
            if (!string.IsNullOrEmpty(dish.ImagePath))
                _fileUploadUtil.DeleteFile(dish.ImagePath);

            dish.ImagePath = await _fileUploadUtil.SaveFileAsync(request.Image);
        }

        await _db.SaveChangesAsync();
        return ToDto(dish);
    }

    public async Task<DishDto> UpdateStatusAsync(int id, UpdateDishStatusRequest request)
    {
        var dish = await _db.Dishes.FindAsync(id)
            ?? throw new KeyNotFoundException("Dish not found");

        if (!Enum.IsDefined(typeof(DishStatus), request.Status))
            throw new ArgumentException($"Invalid status. Use: Available or OutOfStock");
        dish.Status = request.Status;
        await _db.SaveChangesAsync();
        return ToDto(dish);
    }

    public async Task<DishDto> DeleteAsync(int id)
    {
        var dish = await _db.Dishes.FindAsync(id)
            ?? throw new KeyNotFoundException("Dish not found");

        // Delete image file if exists
        if (!string.IsNullOrEmpty(dish.ImagePath))
        {
            _fileUploadUtil.DeleteFile(dish.ImagePath);
        }

        _db.Dishes.Remove(dish);
        await _db.SaveChangesAsync();
        return ToDto(dish);
    }

    // ─── Mapping ──────────────────────────────────────

    public static DishDto ToDto(Dish d) => new(
        d.Id, d.Name, d.Description ?? string.Empty, d.ImagePath, d.Category, d.Price, d.Status.ToString(), d.CreatedAt);
}