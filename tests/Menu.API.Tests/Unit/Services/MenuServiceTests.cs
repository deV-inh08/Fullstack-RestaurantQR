using FluentAssertions;
using Menu.API.Application.DTOs;
using Menu.API.Application.Services;
using Menu.API.Domain.Entities;
using Menu.API.Infrastructure.Persistence;
using Menu.API.Infrastruture.Utils;
using Microsoft.EntityFrameworkCore;
using Moq;
using Shared.DTOs;
using Microsoft.AspNetCore.Http;

namespace Menu.API.Tests.Unit.Services;

public class MenuServiceTests
{
    private readonly Mock<IFileUploadUtil> _fileMock = new();


    private static MenuDbContext CreateContext()
    {
        var opts = new DbContextOptionsBuilder<MenuDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MenuDbContext(opts);
    }

    private MenuService CreateService(MenuDbContext ctx)
        => new(ctx, _fileMock.Object);

    private static Dish SeedDish(MenuDbContext ctx,
        string name = "Phá»Ÿ BÃ²", int price = 85000,
        DishStatus status = DishStatus.Available,
        DishCategory category = DishCategory.MainCourse)
    {
        var dish = new Dish
        {
            Name = name,
            Price = price,
            Description = "Test description",
            Status = status,
            Category = category,
            CreatedAt = DateTime.UtcNow
        };
        ctx.Dishes.Add(dish);
        ctx.SaveChanges();
        return dish;
    }


    [Fact]
    public async Task GetAllAsync_ReturnsCorrectPagedResult()
    {
        // Arrange
        await using var ctx = CreateContext();
        for (var i = 1; i <= 6; i++)
            SeedDish(ctx, name: $"Dish {i}", price: 50000 + i * 1000);

        var svc = CreateService(ctx);

        // Act
        var result = await svc.GetAllAsync(new PaginationParams(Page: 1, PageSize: 4));

        // Assert
        result.Data.Should().HaveCount(4);
        result.Total.Should().Be(6);
        result.TotalPages.Should().Be(2);
    }

    [Fact]
    public async Task GetAllAsync_EmptyDb_ReturnsEmptyResult()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        // Act
        var result = await svc.GetAllAsync(new PaginationParams(1, 20));

        // Assert
        result.Data.Should().BeEmpty();
        result.Total.Should().Be(0);
    }


    [Fact]
    public async Task GetByIdAsync_ExistingDish_ReturnsDto()
    {
        // Arrange
        await using var ctx = CreateContext();
        var dish = SeedDish(ctx, "BÃºn BÃ² Huáº¿", 75000);
        var svc = CreateService(ctx);

        // Act
        var result = await svc.GetByIdAsync(dish.Id);

        // Assert
        result.Name.Should().Be("BÃºn BÃ² Huáº¿");
        result.Price.Should().Be(75000);
        result.Status.Should().Be("Available");
    }

    [Fact]
    public async Task GetByIdAsync_MissingDish_ThrowsKeyNotFoundException()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.GetByIdAsync(999))
            .Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Dish not found");
    }


    [Fact]
    public async Task CreateAsync_ValidRequest_CreatesDishAndSnapshot()
    {
        // Arrange
        await using var ctx = CreateContext();
        _fileMock.Setup(f => f.SaveFileAsync(It.IsAny<IFormFile>(), It.IsAny<string>()))
                 .ReturnsAsync("/images/test.jpg");
        var svc = CreateService(ctx);

        var mockFile = new Mock<IFormFile>();
        mockFile.Setup(f => f.Length).Returns(1024L);


        // Act
        var result = await svc.CreateAsync(new CreateDishRequest
        {
            Name = "New Dish",
            Price = 60000,
            Description = "Delicious",
            Category = DishCategory.MainCourse,
            Image = mockFile.Object
        });

        // Assert
        result.Name.Should().Be("New Dish");
        result.Price.Should().Be(60000);
        result.ImagePath.Should().Be("/images/test.jpg");

        // A snapshot should have been created alongside the dish
        ctx.DishSnapshots.Should().ContainSingle(s => s.Name == "New Dish");
    }

    [Fact]
    public async Task CreateAsync_NoImage_CreatesDishWithNullImagePath()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        // Act
        var result = await svc.CreateAsync(new CreateDishRequest
        {
            Name = "No Photo Dish",
            Price = 40000,
            Description = "Plain",
            Category = DishCategory.Beverage,
            Image = null
        });

        // Assert
        result.ImagePath.Should().BeNull();
        _fileMock.Verify(f => f.SaveFileAsync(It.IsAny<IFormFile>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task CreateAsync_ZeroPrice_ThrowsArgumentException()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.CreateAsync(new CreateDishRequest
        {
            Name = "Bad Dish",
            Price = 0,
            Description = "X",
            Category = DishCategory.MainCourse
        }))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*price must be greater than 0*");
    }

    [Fact]
    public async Task CreateAsync_NegativePrice_ThrowsArgumentException()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        await svc.Invoking(s => s.CreateAsync(new CreateDishRequest
        {
            Name = "Negative",
            Price = -1000,
            Description = "X",
            Category = DishCategory.MainCourse
        }))
            .Should().ThrowAsync<ArgumentException>();
    }


    [Fact]
    public async Task UpdateAsync_PriceChanged_CreatesSnapshot()
    {
        // Arrange
        await using var ctx = CreateContext();
        var dish = SeedDish(ctx, "Dish A", 50000);
        var svc = CreateService(ctx);

        // Act
        await svc.UpdateAsync(dish.Id, new UpdateDishRequest
        {
            Name = "Dish A",
            Price = 60000,   // price changed â†’ snapshot
            Description = "Updated",
            Category = DishCategory.MainCourse
        });

        // Assert: a snapshot of the OLD values should exist
        ctx.DishSnapshots.Should().ContainSingle(s => s.Price == 50000 && s.DishId == dish.Id);
    }

    [Fact]
    public async Task UpdateAsync_NoKeyFieldsChanged_DoesNotCreateSnapshot()
    {
        // Arrange
        await using var ctx = CreateContext();
        var dish = SeedDish(ctx, "Dish B", 50000);
        var svc = CreateService(ctx);
        var snapshotsBefore = ctx.DishSnapshots.Count();

        // Act â€“ same name, price, category
        await svc.UpdateAsync(dish.Id, new UpdateDishRequest
        {
            Name = "Dish B",
            Price = 50000,
            Description = "Updated desc only",
            Category = DishCategory.MainCourse
        });

        // Assert
        ctx.DishSnapshots.Count().Should().Be(snapshotsBefore);  // no new snapshot
    }

    [Fact]
    public async Task UpdateAsync_WithNewImage_DeletesOldAndSavesNew()
    {
        // Arrange
        await using var ctx = CreateContext();
        var dish = SeedDish(ctx);
        dish.ImagePath = "/images/old.jpg";
        await ctx.SaveChangesAsync();

        _fileMock.Setup(f => f.SaveFileAsync(It.IsAny<IFormFile>(), It.IsAny<string>()))
                 .ReturnsAsync("/images/new.jpg");

        var mockFile = new Mock<IFormFile>();
        mockFile.Setup(f => f.Length).Returns(1024);

        var svc = CreateService(ctx);

        // Act
        await svc.UpdateAsync(dish.Id, new UpdateDishRequest
        {
            Name = dish.Name,
            Price = dish.Price,
            Description = "X",
            Category = dish.Category,
            Image = mockFile.Object
        });

        // Assert
        _fileMock.Verify(f => f.DeleteFile("/images/old.jpg"), Times.Once);
        _fileMock.Verify(f => f.SaveFileAsync(It.IsAny<IFormFile>(), It.IsAny<string>()), Times.Once);
    }


    [Fact]
    public async Task UpdateStatusAsync_ValidStatus_UpdatesDish()
    {
        // Arrange
        await using var ctx = CreateContext();
        var dish = SeedDish(ctx, status: DishStatus.Available);
        var svc = CreateService(ctx);

        // Act
        var result = await svc.UpdateStatusAsync(dish.Id,
            new UpdateDishStatusRequest(DishStatus.OutOfStock));

        // Assert
        result.Status.Should().Be("OutOfStock");
    }


    [Fact]
    public async Task DeleteAsync_DishWithImage_DeletesFileAndRecord()
    {
        // Arrange
        await using var ctx = CreateContext();
        var dish = SeedDish(ctx);
        dish.ImagePath = "/images/meal.jpg";
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);

        // Act
        var result = await svc.DeleteAsync(dish.Id);

        // Assert
        result.Name.Should().Be(dish.Name);
        ctx.Dishes.Should().BeEmpty();
        _fileMock.Verify(f => f.DeleteFile("/images/meal.jpg"), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_MissingDish_ThrowsKeyNotFoundException()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.DeleteAsync(999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }
}
