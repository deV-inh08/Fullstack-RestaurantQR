using FluentAssertions;
using Moq;
using Order.API.Application.DTOs;
using Order.API.Application.Interfaces;
using Order.API.Application.Service;
using Order.API.Domain.Entities;
using Order.API.Tests.Helpers;
using System.Security.Claims;
using Order.API.Infrastructure.Persistence;

namespace Order.API.Tests.Unit.Services;

public class GuestServiceTests
{
    private readonly Mock<IGuestJwtUtil> _jwtMock = new();

    private GuestService CreateService(out OrderDbContext ctx)
    {
        ctx = OrderDbContextFactory.Create();
        return new GuestService(ctx, _jwtMock.Object);
    }

    private static Table SeedTable(OrderDbContext ctx,
        int number = 1, TableStatus status = TableStatus.Available)
    {
        var table = new Table
        {
            Number = number,
            Capacity = 4,
            Status = status,
            SessionId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        ctx.Tables.Add(table);
        ctx.SaveChanges();
        return table;
    }

    // â”€â”€ LoginAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task LoginAsync_AvailableTable_CreatesGuestAndChangesTableToOccupied()
    {
        // Arrange
        var svc = CreateService(out var ctx);
        var table = SeedTable(ctx, number: 5, status: TableStatus.Available);

        _jwtMock.Setup(j => j.GenerateAccessToken(It.IsAny<Guest>(), It.IsAny<Guid>()))
                .Returns("access_tok");
        _jwtMock.Setup(j => j.GenerateRefreshToken(It.IsAny<Guest>(), It.IsAny<Guid>()))
                .Returns("refresh_tok");

        // Act
        var result = await svc.LoginAsync(new GuestLoginRequest(
            TableNumber: 5, Name: "Nguyá»…n VÄƒn A"));

        // Assert
        result.AccessToken.Should().Be("access_tok");
        result.RefreshToken.Should().Be("refresh_tok");
        result.Guest.Name.Should().Be("Nguyá»…n VÄƒn A");
        result.Guest.TableNumber.Should().Be(5);

        // Table status must transition to Occupied
        var updatedTable = await ctx.Tables.FindAsync(table.Id);
        updatedTable!.Status.Should().Be(TableStatus.Occupied);

        // Guest record must exist in DB
        ctx.Guests.Should().ContainSingle(g => g.Name == "Nguyá»…n VÄƒn A");
    }

    [Fact]
    public async Task LoginAsync_TableNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var svc = CreateService(out _);

        // Act & Assert
        await svc.Invoking(s => s.LoginAsync(new GuestLoginRequest(99, "X")))
            .Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Table not found");
    }

    [Fact]
    public async Task LoginAsync_OccupiedTable_ThrowsArgumentException()
    {
        // Arrange
        var svc = CreateService(out var ctx);
        SeedTable(ctx, number: 2, status: TableStatus.Occupied);

        // Act & Assert
        await svc.Invoking(s => s.LoginAsync(new GuestLoginRequest(2, "Bob")))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("Table is not available");
    }

    [Fact]
    public async Task LoginAsync_HiddenTable_ThrowsArgumentException()
    {
        // Arrange
        var svc = CreateService(out var ctx);
        SeedTable(ctx, number: 3, status: TableStatus.Hidden);

        // Act & Assert
        await svc.Invoking(s => s.LoginAsync(new GuestLoginRequest(3, "Carol")))
            .Should().ThrowAsync<ArgumentException>();
    }

    // â”€â”€ RefreshTokenAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task RefreshTokenAsync_ValidToken_ReturnsNewTokenPair()
    {
        // Arrange
        var svc = CreateService(out var ctx);
        var table = SeedTable(ctx, number: 1);

        var guest = new Guest
        {
            Name = "Dave",
            TableId = table.Id,
            TableNumber = 1,
            SessionId = table.SessionId,
            CreatedAt = DateTime.UtcNow
        };
        ctx.Guests.Add(guest);
        await ctx.SaveChangesAsync();

        // Set up ValidateToken to return claims matching the guest
        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("guestId", guest.Id.ToString()),
            new Claim("sessionId", table.SessionId.ToString())
        }));
        _jwtMock.Setup(j => j.ValidateToken("old_rt", true)).Returns(claims);
        _jwtMock.Setup(j => j.GenerateAccessToken(It.IsAny<Guest>(), It.IsAny<Guid>()))
                .Returns("new_at");
        _jwtMock.Setup(j => j.GenerateRefreshToken(It.IsAny<Guest>(), It.IsAny<Guid>()))
                .Returns("new_rt");

        // Act
        var result = await svc.RefreshTokenAsync(new GuestRefreshTokenRequest("old_rt"));

        // Assert
        result.AccessToken.Should().Be("new_at");
        result.RefreshToken.Should().Be("new_rt");
    }

    [Fact]
    public async Task RefreshTokenAsync_InvalidSignature_ThrowsUnauthorized()
    {
        // Arrange
        var svc = CreateService(out _);
        _jwtMock.Setup(j => j.ValidateToken(It.IsAny<string>(), true))
                .Throws(new Exception("bad token"));

        // Act & Assert
        await svc.Invoking(s => s.RefreshTokenAsync(new GuestRefreshTokenRequest("garbage")))
            .Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Refresh token is invalid*");
    }

    [Fact]
    public async Task RefreshTokenAsync_SessionMismatch_ThrowsUnauthorized()
    {
        // Arrange â€“ guest is from an old session; table now has a new session
        var svc = CreateService(out var ctx);
        var table = SeedTable(ctx, number: 1);

        var guest = new Guest
        {
            Name = "Eve",
            TableId = table.Id,
            TableNumber = 1,
            SessionId = Guid.NewGuid(), // different session â†’ mismatch
            CreatedAt = DateTime.UtcNow
        };
        ctx.Guests.Add(guest);
        await ctx.SaveChangesAsync();

        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("guestId", guest.Id.ToString()),
            new Claim("sessionId", guest.SessionId.ToString()) // old session in token
        }));
        _jwtMock.Setup(j => j.ValidateToken("stale_rt", true)).Returns(claims);

        // Act & Assert
        await svc.Invoking(s => s.RefreshTokenAsync(new GuestRefreshTokenRequest("stale_rt")))
            .Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Session has expired*");
    }
}
