using Menu.API.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Menu.API.Application.DTOs;

public record DishDto(
    int Id,
    string Name,
    string Description,
    string? ImagePath,
    DishCategory Category,
    int Price,
    string Status,
    DateTime CreatedAt);

public class CreateDishRequest
{
    [FromForm(Name = "name")]
    public required string Name { get; set; }

    [FromForm(Name = "price")]
    public required decimal Price { get; set; }

    [FromForm(Name = "description")]
    public required string Description { get; set; }

    [FromForm(Name = "category")]
    public required DishCategory Category { get; set; }

    [FromForm(Name = "image")]
    public IFormFile? Image { get; set; }
}

// ← Changed from record to class with [FromForm] for multipart support
public class UpdateDishRequest
{
    [FromForm(Name = "name")]
    public required string Name { get; set; }

    [FromForm(Name = "price")]
    public required int Price { get; set; }

    [FromForm(Name = "description")]
    public string Description { get; set; } = string.Empty;

    [FromForm(Name = "category")]
    public required DishCategory Category { get; set; }

    /// <summary>
    /// New image file. If null, the existing image is kept unchanged.
    /// </summary>
    [FromForm(Name = "image")]
    public IFormFile? Image { get; set; }
}

public record UpdateDishStatusRequest(DishStatus Status);

public record DishSnapshotDto(
    int Id,
    string Name,
    decimal Price,
    string? Description,
    string Category,
    string? ImagePath,
    int DishId,
    DateTime CreatedAt
);