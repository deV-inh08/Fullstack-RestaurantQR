using FluentAssertions;
using Moq;
using Order.API.Application.DTOs;
using Order.API.Application.Service;
using Order.API.Domain.Entities;
using Order.API.Tests.Helpers;
using Microsoft.AspNetCore.SignalR;
using Order.API.Hubs;
using Order.API.Infrastructure.Persistence;

namespace Order.API.Tests.Unit.Services;

public class OrderServiceTests
{

    private static (OrderDbContext ctx, Table table, Guest guest) SetupTableAndGuest(
        TableStatus tableStatus = TableStatus.Occupied)
    {
        var ctx = OrderDbContextFactory.Create();
        var table = new Table
        {
            Number = 1,
            Capacity = 4,
            Status = tableStatus,
            SessionId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        ctx.Tables.Add(table);
        ctx.SaveChanges();

        var guest = new Guest
        {
            Name = "Tráº§n VÄƒn B",
            TableId = table.Id,
            TableNumber = 1,
            SessionId = table.SessionId,
            CreatedAt = DateTime.UtcNow
        };
        ctx.Guests.Add(guest);
        ctx.SaveChanges();

        return (ctx, table, guest);
    }

    private static OrderService CreateService(OrderDbContext ctx,
        int snapshotId = 1, string dishName = "Phá»Ÿ", decimal price = 85000)
    {
        var menuClient = MenuApiClientFactory.CreateWithSnapshot(snapshotId, dishName, price);
        var hub = HubContextHelper.Create();
        return new OrderService(ctx, menuClient, hub.Object);
    }


    [Fact]
    public async Task GetAllAsync_ReturnsPagedOrders()
    {
        // Arrange
        var (ctx, table, guest) = SetupTableAndGuest();
        for (var i = 0; i < 5; i++)
        {
            ctx.Orders.Add(new Order.API.Domain.Entities.Order
            {
                GuestId = guest.Id,
                TableId = table.Id,
                DishSnapshotId = 1,
                DishName = "Dish",
                DishPrice = 50000,
                Quantity = 1,
                Status = OrderStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);

        // Act
        var result = await svc.GetAllAsync(new Shared.DTOs.PaginationParams(1, 3));

        // Assert
        result.Data.Should().HaveCount(3);
        result.Total.Should().Be(5);
    }


    [Fact]
    public async Task GetByGuestAsync_ReturnsOnlyGuestOrders()
    {
        // Arrange
        var (ctx, table, guest1) = SetupTableAndGuest();
        var guest2 = new Guest
        {
            Name = "Another",
            TableId = table.Id,
            TableNumber = 1,
            SessionId = table.SessionId,
            CreatedAt = DateTime.UtcNow
        };
        ctx.Guests.Add(guest2);
        await ctx.SaveChangesAsync();

        ctx.Orders.Add(new Order.API.Domain.Entities.Order
        {
            GuestId = guest1.Id,
            TableId = table.Id,
            DishSnapshotId = 1,
            DishName = "A",
            DishPrice = 50000,
            Quantity = 1,
            Status = OrderStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        ctx.Orders.Add(new Order.API.Domain.Entities.Order
        {
            GuestId = guest2.Id,
            TableId = table.Id,
            DishSnapshotId = 2,
            DishName = "B",
            DishPrice = 60000,
            Quantity = 2,
            Status = OrderStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);

        // Act
        var result = await svc.GetByGuestAsync(guest1.Id);

        // Assert
        result.Should().ContainSingle();
        result[0].GuestId.Should().Be(guest1.Id);
    }


    [Fact]
    public async Task CreateAsync_ValidGuestAndSnapshot_CreatesOrderAndBroadcasts()
    {
        // Arrange
        var (ctx, table, guest) = SetupTableAndGuest();
        var hubMock = HubContextHelper.Create();
        var menuClient = MenuApiClientFactory.CreateWithSnapshot(5, "CÆ¡m Táº¥m", 70000, "/img.jpg");
        var svc = new OrderService(ctx, menuClient, hubMock.Object);

        // Act
        var result = await svc.CreateAsync(guest.Id, table.SessionId,
            new CreateOrderRequest(TableId: table.Id, DishSnapshotId: 5, Quantity: 2));

        // Assert â€“ order persisted
        result.DishName.Should().Be("CÆ¡m Táº¥m");
        result.DishPrice.Should().Be(70000);
        result.Quantity.Should().Be(2);
        result.Status.Should().Be("Pending");
        ctx.Orders.Should().ContainSingle();

        // SignalR broadcast to "staff" group
        var clientsMock = Mock.Get(hubMock.Object.Clients);
        clientsMock.Verify(c => c.Group("staff"), Times.AtLeastOnce);
        clientsMock.Verify(c => c.Group($"table-{table.Number}"), Times.AtLeastOnce);
    }

    [Fact]
    public async Task CreateAsync_ZeroQuantity_ThrowsArgumentException()
    {
        // Arrange
        var (ctx, table, guest) = SetupTableAndGuest();
        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.CreateAsync(guest.Id, table.SessionId,
                new CreateOrderRequest(table.Id, 1, Quantity: 0)))
            .Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateAsync_SessionMismatch_ThrowsUnauthorized()
    {
        // Arrange â€“ table session has changed since guest last logged in
        var (ctx, table, guest) = SetupTableAndGuest();
        var staleSession = Guid.NewGuid();   // different from table.SessionId
        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.CreateAsync(guest.Id, staleSession,
                new CreateOrderRequest(table.Id, 1, 1)))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task CreateAsync_SnapshotNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var (ctx, table, guest) = SetupTableAndGuest();
        var menuClient = MenuApiClientFactory.CreateNotFound();
        var hub = HubContextHelper.Create();
        var svc = new OrderService(ctx, menuClient, hub.Object);

        // Act & Assert
        await svc.Invoking(s => s.CreateAsync(guest.Id, table.SessionId,
                new CreateOrderRequest(table.Id, 999, 1)))
            .Should().ThrowAsync<KeyNotFoundException>();
    }


    [Fact]
    public async Task CreateAsStaffAsync_OccupiedTable_CreatesOrder()
    {
        // Arrange
        var (ctx, table, _) = SetupTableAndGuest();
        var svc = CreateService(ctx, dishName: "Staff Order Dish");

        // Act
        var result = await svc.CreateAsStaffAsync(
            new CreateOrderRequest(TableId: table.Id, DishSnapshotId: 1, Quantity: 3));

        // Assert
        result.Quantity.Should().Be(3);
        result.DishName.Should().Be("Staff Order Dish");
    }

    [Fact]
    public async Task CreateAsStaffAsync_NullTableId_ThrowsArgumentException()
    {
        // Arrange
        var ctx = OrderDbContextFactory.Create();
        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.CreateAsStaffAsync(
                new CreateOrderRequest(TableId: null, DishSnapshotId: 1, Quantity: 1)))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*TableId is required*");
    }


    [Fact]
    public async Task UpdateStatusAsync_ValidOrder_UpdatesStatusAndBroadcasts()
    {
        // Arrange
        var (ctx, table, guest) = SetupTableAndGuest();
        var order = new Order.API.Domain.Entities.Order
        {
            GuestId = guest.Id,
            TableId = table.Id,
            DishSnapshotId = 1,
            DishName = "X",
            DishPrice = 50000,
            Quantity = 1,
            Status = OrderStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        ctx.Orders.Add(order);
        await ctx.SaveChangesAsync();

        var hubMock = HubContextHelper.Create();
        var menuClient = MenuApiClientFactory.CreateWithSnapshot(1, "X", 50000);
        var svc = new OrderService(ctx, menuClient, hubMock.Object);

        // Act
        var result = await svc.UpdateStatusAsync(order.Id,
            new UpdateOrderStatusRequest(OrderStatus.Preparing, AccountId: 7));

        // Assert
        result.Status.Should().Be("Preparing");
        var clientsMock = Mock.Get(hubMock.Object.Clients);
        clientsMock.Verify(c => c.Group("staff"), Times.AtLeastOnce);
    }
}
