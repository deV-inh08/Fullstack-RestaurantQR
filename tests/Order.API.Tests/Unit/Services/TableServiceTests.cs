using FluentAssertions;
using Order.API.Application.DTOs;
using Order.API.Application.Service;
using Order.API.Domain.Entities;
using Order.API.Tests.Helpers;
using Order.API.Infrastructure.Persistence;
namespace Order.API.Tests.Unit.Services;

public class TableServiceTests
{
    private TableService CreateService(out OrderDbContext ctx)
    {
        ctx = OrderDbContextFactory.Create();
        var hub = HubContextHelper.Create();
        return new TableService(ctx, hub.Object);
    }

    private static Table SeedTable(OrderDbContext ctx,
        int number = 1, int capacity = 4,
        TableStatus status = TableStatus.Available,
        bool visibleOnReservation = true)
    {
        var table = new Table
        {
            Number = number,
            Capacity = capacity,
            Status = status,
            IsVisibleOnReservation = visibleOnReservation,
            SessionId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        ctx.Tables.Add(table);
        ctx.SaveChanges();
        return table;
    }

    // â”€â”€ GetAllAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task GetAllAsync_ReturnsPaginatedTablesOrderedByNumber()
    {
        // Arrange
        var svc = CreateService(out var ctx);
        SeedTable(ctx, 3); SeedTable(ctx, 1); SeedTable(ctx, 2);

        // Act
        var result = await svc.GetAllAsync(new Shared.DTOs.PaginationParams(1, 10));

        // Assert â€“ tables ordered by Number ascending
        result.Data.Select(t => t.Number).Should().BeInAscendingOrder();
        result.Total.Should().Be(3);
    }

    // â”€â”€ GetByIdAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task GetByIdAsync_ExistingTable_ReturnsDto()
    {
        // Arrange
        var svc = CreateService(out var ctx);
        var table = SeedTable(ctx, number: 5, capacity: 8);

        // Act
        var result = await svc.GetByIdAsync(table.Id);

        // Assert
        result.Number.Should().Be(5);
        result.Capacity.Should().Be(8);
        result.Status.Should().Be("Available");
    }

    [Fact]
    public async Task GetByIdAsync_Missing_ThrowsKeyNotFoundException()
    {
        var svc = CreateService(out _);
        await svc.Invoking(s => s.GetByIdAsync(999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // â”€â”€ CreateAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task CreateAsync_UniqueNumber_CreatesTableWithAvailableStatus()
    {
        // Arrange
        var svc = CreateService(out var ctx);

        // Act
        var result = await svc.CreateAsync(new CreateTableRequest(Number: 10, Capacity: 6));

        // Assert
        result.Number.Should().Be(10);
        result.Status.Should().Be("Available");
        ctx.Tables.Should().ContainSingle();
    }

    [Fact]
    public async Task CreateAsync_DuplicateNumber_ThrowsArgumentException()
    {
        // Arrange
        var svc = CreateService(out var ctx);
        SeedTable(ctx, number: 3);

        // Act & Assert
        await svc.Invoking(s => s.CreateAsync(new CreateTableRequest(Number: 3, Capacity: 4)))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Table number 3 already exists*");
    }

    // â”€â”€ UpdateStatusAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task UpdateStatusAsync_ValidTable_ChangesStatus()
    {
        // Arrange
        var svc = CreateService(out var ctx);
        var table = SeedTable(ctx, status: TableStatus.Available);

        // Act
        var result = await svc.UpdateStatusAsync(table.Id,
            new UpdateTableStatusRequest(TableStatus.Occupied));

        // Assert
        result.Status.Should().Be("Occupied");
    }

    // â”€â”€ UpdateVisibilityAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task UpdateVisibilityAsync_TogglesReservationFlag()
    {
        // Arrange
        var svc = CreateService(out var ctx);
        var table = SeedTable(ctx, visibleOnReservation: true);

        // Act â€“ hide from reservations
        var result = await svc.UpdateVisibilityAsync(table.Id,
            new UpdateTableVisibilityRequest(IsVisibleOnReservation: false));

        // Assert
        result.IsVisibleOnReservation.Should().BeFalse();
    }

    // â”€â”€ ResetTableAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task ResetTableAsync_ChangesSessionIdAndSetsHidden()
    {
        // Arrange
        var svc = CreateService(out var ctx);
        var table = SeedTable(ctx, status: TableStatus.Occupied);
        var oldSession = table.SessionId;

        // Act
        var result = await svc.ResetTableAsync(table.Id);

        // Assert
        result.Status.Should().Be("Hidden");

        var updated = await ctx.Tables.FindAsync(table.Id);
        updated!.SessionId.Should().NotBe(oldSession);   // new session invalidates old tokens
    }

    // â”€â”€ DeleteAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task DeleteAsync_ExistingTable_RemovesFromDb()
    {
        // Arrange
        var svc = CreateService(out var ctx);
        var table = SeedTable(ctx);

        // Act
        var result = await svc.DeleteAsync(table.Id);

        // Assert
        result.Number.Should().Be(table.Number);
        ctx.Tables.Should().BeEmpty();
    }

    // â”€â”€ GetAvailableForReservationAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task GetAvailableForReservationAsync_ReturnsOnlyVisibleTables()
    {
        // Arrange
        var svc = CreateService(out var ctx);
        SeedTable(ctx, number: 1, visibleOnReservation: true);
        SeedTable(ctx, number: 2, visibleOnReservation: false);
        SeedTable(ctx, number: 3, visibleOnReservation: true);

        // Act
        var result = await svc.GetAvailableForReservationAsync();

        // Assert
        result.Should().HaveCount(2);
        result.Select(t => t.Number).Should().BeEquivalentTo(new[] { 1, 3 });
    }
}
