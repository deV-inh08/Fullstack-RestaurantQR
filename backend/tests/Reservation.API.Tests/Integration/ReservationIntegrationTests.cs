// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Integration tests for ReservationService using Testcontainers.MongoDb.
//
// REQUIRES:
//   1. Docker running on the host machine.
//   2. Package: Testcontainers.MongoDb (add to Reservation.API.Tests.csproj)
//
//      <PackageReference Include="Testcontainers.MongoDb" Version="3.10.0" />
//
// These tests spin up a real MongoDB container, execute service operations,
// and assert database state. They are slower than unit tests but provide
// high confidence in the persistence layer.
//
// Run selectively with:
//   dotnet test --filter "Category=Integration"
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/*
using FluentAssertions;
using MongoDB.Driver;
using Reservation.API.Application.DTOs;
using Reservation.API.Application.Services;
using Reservation.API.Domain.Entities;
using Reservation.API.Infrastructure.Persistence;
using Testcontainers.MongoDb;
using Xunit;

namespace Reservation.API.Tests.Integration;

[Trait("Category", "Integration")]
public class ReservationIntegrationTests : IAsyncLifetime
{
    private readonly MongoDbContainer _container = new MongoDbBuilder()
        .WithImage("mongo:7")
        .Build();

    private ReservationService _svc = null!;
    private IMongoCollection<Reservation.API.Domain.Entities.Reservation> _collection = null!;

    // â”€â”€ Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        var settings = new MongoDbSettings
        {
            ConnectionString = _container.GetConnectionString(),
            DatabaseName     = "ReservationTestDb"
        };

        var ctx  = new ReservationDbContext(settings);
        _svc     = new ReservationService(ctx);
        _collection = ctx.Reservations;
    }

    public async Task DisposeAsync()
    {
        await _container.StopAsync();
        await _container.DisposeAsync();
    }

    // â”€â”€ CreateAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task CreateAsync_ValidRequest_PersistsToMongoDB()
    {
        // Arrange
        var request = new CreateReservationRequest(
            GuestName      : "Tráº§n Thá»‹ Mai",
            GuestPhone     : "0901234567",
            GuestEmail     : "mai@example.com",
            TableId        : 3,
            TableNumber    : 3,
            NumberOfPeople : 4,
            ReservationDate: DateTime.UtcNow.AddDays(1),
            DepositAmount  : 200_000,
            DepositStatus  : DepositStatus.Pending,
            Note           : "Birthday celebration");

        // Act
        var result = await _svc.CreateAsync(request);

        // Assert
        result.Id.Should().NotBeNullOrEmpty();
        result.GuestName.Should().Be("Tráº§n Thá»‹ Mai");
        result.Status.Should().Be("Booked");

        var inDb = await _collection.Find(r => r.Id == result.Id).FirstOrDefaultAsync();
        inDb.Should().NotBeNull();
        inDb.GuestPhone.Should().Be("0901234567");
    }

    // â”€â”€ GetAllAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task GetAllAsync_WithStatusFilter_ReturnsOnlyMatchingStatus()
    {
        // Arrange â€“ seed two Booked and one CheckedIn
        await _svc.CreateAsync(new CreateReservationRequest(
            "Guest 1", "09111", null, 1, 1, 2, DateTime.UtcNow.AddDays(1),
            0, DepositStatus.None, null));
        await _svc.CreateAsync(new CreateReservationRequest(
            "Guest 2", "09222", null, 1, 1, 2, DateTime.UtcNow.AddDays(2),
            0, DepositStatus.None, null));
        var r3 = await _svc.CreateAsync(new CreateReservationRequest(
            "Guest 3", "09333", null, 2, 2, 3, DateTime.UtcNow.AddDays(1),
            0, DepositStatus.None, null));

        // Move r3 to CheckedIn
        await _svc.UpdateStatusAsync(r3.Id,
            new UpdateReservationStatusRequest(ReservationStatus.CheckedIn, AccountId: 1));

        // Act
        var bookedOnly = await _svc.GetAllAsync(
            new ReservationQueryParams(Status: ReservationStatus.Booked));

        // Assert
        bookedOnly.Data.Should().HaveCount(2);
        bookedOnly.Data.All(r => r.Status == "Booked").Should().BeTrue();
    }

    // â”€â”€ UpdateStatusAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task UpdateStatusAsync_BookedToCheckedIn_UpdatesMongoDB()
    {
        // Arrange
        var created = await _svc.CreateAsync(new CreateReservationRequest(
            "LÃª VÄƒn C", "09444", null, 4, 4, 2, DateTime.UtcNow.AddDays(1),
            0, DepositStatus.None, null));

        // Act
        var updated = await _svc.UpdateStatusAsync(created.Id,
            new UpdateReservationStatusRequest(ReservationStatus.CheckedIn, AccountId: 5));

        // Assert
        updated.Status.Should().Be("CheckedIn");
        updated.AccountId.Should().Be(5);

        var inDb = await _collection.Find(r => r.Id == created.Id).FirstOrDefaultAsync();
        inDb.Status.Should().Be(ReservationStatus.CheckedIn);
    }

    [Fact]
    public async Task UpdateStatusAsync_CancelledToCancelled_ThrowsArgumentException()
    {
        // Arrange
        var created = await _svc.CreateAsync(new CreateReservationRequest(
            "X", "09555", null, 1, 1, 1, DateTime.UtcNow.AddDays(1),
            0, DepositStatus.None, null));
        await _svc.UpdateStatusAsync(created.Id,
            new UpdateReservationStatusRequest(ReservationStatus.Cancelled, null));

        // Act & Assert â€“ can't go from Cancelled back to Booked
        await _svc.Invoking(s => s.UpdateStatusAsync(created.Id,
                new UpdateReservationStatusRequest(ReservationStatus.Booked, null)))
            .Should().ThrowAsync<ArgumentException>();
    }

    // â”€â”€ DeleteAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task DeleteAsync_ExistingReservation_RemovesFromMongoDB()
    {
        // Arrange
        var created = await _svc.CreateAsync(new CreateReservationRequest(
            "Delete Me", "09666", null, 1, 1, 2, DateTime.UtcNow.AddDays(1),
            0, DepositStatus.None, null));

        // Act
        var deleted = await _svc.DeleteAsync(created.Id);

        // Assert
        deleted.Id.Should().Be(created.Id);
        var inDb = await _collection.Find(r => r.Id == created.Id).FirstOrDefaultAsync();
        inDb.Should().BeNull();
    }
}
*/

// This file is intentionally commented out. Uncomment and add Testcontainers.MongoDb
// to use these integration tests.
