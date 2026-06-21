using FluentAssertions;
using Moq;
using Order.API.Application.DTOs;
using Order.API.Application.Service;
using Order.API.Domain.Entities;
using Order.API.Tests.Helpers;
using Order.API.Infrastructure.Persistence;

namespace Order.API.Tests.Unit.Services;

public class BillServiceTests
{

    private static (OrderDbContext ctx, Table table, Guest guest) Seed(
        int tableNumber = 1, TableStatus status = TableStatus.Occupied)
    {
        var ctx = OrderDbContextFactory.Create();
        var table = new Table
        {
            Number = tableNumber,
            Capacity = 4,
            Status = status,
            SessionId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        ctx.Tables.Add(table);
        ctx.SaveChanges();

        var guest = new Guest
        {
            Name = "Alice",
            TableId = table.Id,
            TableNumber = tableNumber,
            SessionId = table.SessionId,
            CreatedAt = DateTime.UtcNow
        };
        ctx.Guests.Add(guest);
        ctx.SaveChanges();
        return (ctx, table, guest);
    }

    private static void AddOrder(OrderDbContext ctx, int guestId, int tableId,
        decimal price = 50000, int qty = 1,
        OrderStatus status = OrderStatus.Pending)
    {
        ctx.Orders.Add(new Order.API.Domain.Entities.Order
        {
            GuestId = guestId,
            TableId = tableId,
            DishSnapshotId = 1,
            DishName = "Dish",
            DishPrice = price,
            Quantity = qty,
            Status = status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        ctx.SaveChanges();
    }

    private static BillService CreateBillService(OrderDbContext ctx)
        => new(ctx, HubContextHelper.Create().Object);


    [Fact]
    public async Task GetAllAsync_ReturnsPaginatedBills()
    {
        // Arrange
        var (ctx, table, _) = Seed();
        for (var i = 0; i < 4; i++)
        {
            ctx.Bills.Add(new Bill
            {
                TableId = table.Id,
                SessionId = table.SessionId,
                GuestName = "Guest",
                TotalAmount = 100000,
                Status = BillStatus.Unpaid,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        await ctx.SaveChangesAsync();

        var svc = CreateBillService(ctx);

        // Act
        var result = await svc.GetAllAsync(new Shared.DTOs.PaginationParams(1, 2));

        // Assert
        result.Data.Should().HaveCount(2);
        result.Total.Should().Be(4);
    }

    [Fact]
    public async Task GetByTableAsync_ExistingBill_ReturnsBillDtoWithOrders()
    {
        // Arrange
        var (ctx, table, guest) = Seed();
        AddOrder(ctx, guest.Id, table.Id, price: 85000, qty: 2);

        ctx.Bills.Add(new Bill
        {
            TableId = table.Id,
            SessionId = table.SessionId,
            GuestName = "Alice",
            TotalAmount = 170000,
            Status = BillStatus.Requested,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await ctx.SaveChangesAsync();

        var svc = CreateBillService(ctx);

        // Act
        var result = await svc.GetByTableAsync(table.Id);

        // Assert
        result.TableId.Should().Be(table.Id);
        result.Status.Should().Be("Requested");
        result.Orders.Should().ContainSingle(o => o.Quantity == 2);
        result.TotalAmount.Should().Be(170000);
    }

    [Fact]
    public async Task GetByTableAsync_NoBill_ReturnsComputedUnpaidBill()
    {
        // Arrange â€“ no Bill entity, but orders exist
        var (ctx, table, guest) = Seed();
        AddOrder(ctx, guest.Id, table.Id, price: 50000, qty: 3);   // 150 000
        AddOrder(ctx, guest.Id, table.Id, price: 30000, qty: 1);   //  30 000

        var svc = CreateBillService(ctx);

        // Act
        var result = await svc.GetByTableAsync(table.Id);

        // Assert â€“ computed bill
        result.Id.Should().Be(0);           // transient â€“ no DB id yet
        result.Status.Should().Be("Unpaid");
        result.TotalAmount.Should().Be(180000);
        result.Orders.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetByTableAsync_CancelledOrdersNotIncluded()
    {
        // Arrange
        var (ctx, table, guest) = Seed();
        AddOrder(ctx, guest.Id, table.Id, price: 100000, qty: 1);
        AddOrder(ctx, guest.Id, table.Id, price: 50000, qty: 1, status: OrderStatus.Cancelled);

        var svc = CreateBillService(ctx);

        // Act
        var result = await svc.GetByTableAsync(table.Id);

        // Assert â€“ only non-cancelled orders count
        result.TotalAmount.Should().Be(100000);
        result.Orders.Should().ContainSingle();
    }


    [Fact]
    public async Task RequestBillAsync_ValidGuest_CreatesBillAndBroadcasts()
    {
        // Arrange
        var (ctx, table, guest) = Seed(status: TableStatus.Occupied);
        AddOrder(ctx, guest.Id, table.Id, price: 75000, qty: 2);  // total 150 000

        var hubMock = HubContextHelper.Create();
        var svc = new BillService(ctx, hubMock.Object);

        // Act
        var result = await svc.RequestBillAsync(guest.Id, table.SessionId);

        // Assert
        result.Status.Should().Be("Requested");
        result.TotalAmount.Should().Be(150000);
        ctx.Bills.Should().ContainSingle();

        var clientsMock = Mock.Get(hubMock.Object.Clients);
        clientsMock.Verify(c => c.Group("staff"), Times.AtLeastOnce);
    }

    [Fact]
    public async Task RequestBillAsync_TableNotOccupied_ThrowsArgumentException()
    {
        // Arrange
        var (ctx, table, guest) = Seed(status: TableStatus.Available);
        var svc = CreateBillService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.RequestBillAsync(guest.Id, table.SessionId))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Bàn không ở trạng thái phục vụ*");
    }
    [Fact]
    public async Task RequestBillAsync_SessionMismatch_ThrowsUnauthorized()
    {
        // Arrange
        var (ctx, table, guest) = Seed(status: TableStatus.Occupied);
        var staleSession = Guid.NewGuid();
        var svc = CreateBillService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.RequestBillAsync(guest.Id, staleSession))
            .Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Phiên đã hết hạn*");
    }

    [Fact]
    public async Task RequestBillAsync_AlreadyPaidBill_ThrowsArgumentException()
    {
        // Arrange
        var (ctx, table, guest) = Seed(status: TableStatus.Occupied);
        ctx.Bills.Add(new Bill
        {
            TableId = table.Id,
            SessionId = table.SessionId,
            GuestName = "Alice",
            TotalAmount = 100000,
            Status = BillStatus.Paid,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await ctx.SaveChangesAsync();

        var svc = CreateBillService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.RequestBillAsync(guest.Id, table.SessionId))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Đã được thanh toán*");
    }


    [Fact]
    public async Task ConfirmPaymentAsync_RequestedBill_MarksAsPaidAndResetsTable()
    {
        // Arrange
        var (ctx, table, _) = Seed();
        var bill = new Bill
        {
            TableId = table.Id,
            SessionId = table.SessionId,
            GuestName = "Alice",
            TotalAmount = 200000,
            Status = BillStatus.Requested,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        ctx.Bills.Add(bill);
        await ctx.SaveChangesAsync();

        var hubMock = HubContextHelper.Create();
        var svc = new BillService(ctx, hubMock.Object);
        var oldSession = table.SessionId;

        // Act
        var result = await svc.ConfirmPaymentAsync(bill.Id, accountId: 3);

        // Assert
        result.Status.Should().Be("Paid");
        result.AccountId.Should().Be(3);

        // Table should get a new session and Hidden status
        var updatedTable = await ctx.Tables.FindAsync(table.Id);
        updatedTable!.Status.Should().Be(TableStatus.Hidden);
        updatedTable.SessionId.Should().NotBe(oldSession);

        // Broadcasts to both staff and the table group
        var clientsMock = Mock.Get(hubMock.Object.Clients);
        clientsMock.Verify(c => c.Group("staff"), Times.AtLeastOnce);
        clientsMock.Verify(c => c.Group($"table-{table.Number}"), Times.AtLeastOnce);
    }

    [Fact]
    public async Task ConfirmPaymentAsync_AlreadyPaid_ThrowsArgumentException()
    {
        // Arrange
        var (ctx, table, _) = Seed();
        var bill = new Bill
        {
            TableId = table.Id,
            SessionId = table.SessionId,
            GuestName = "X",
            TotalAmount = 0,
            Status = BillStatus.Paid,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        ctx.Bills.Add(bill);
        await ctx.SaveChangesAsync();

        var svc = CreateBillService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.ConfirmPaymentAsync(bill.Id, 1))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Đã được thanh toán*");
    }
}
