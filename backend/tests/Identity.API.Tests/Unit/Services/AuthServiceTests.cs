using FluentAssertions;
using Identity.API.Application.DTOs;
using Identity.API.Application.Interfaces;
using Identity.API.Application.Services;
using Identity.API.Domain.Entities;
using Identity.API.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Identity.API.Tests.Unit.Services;

public class AuthServiceTests
{
    private readonly Mock<IJwtUtil> _jwtUtilMock = new();
    private readonly Mock<IPasswordUtil> _passwordUtilMock = new();


    private static IdentityDbContext CreateContext(string dbName = "")
    {
        var options = new DbContextOptionsBuilder<IdentityDbContext>()
            .UseInMemoryDatabase(string.IsNullOrEmpty(dbName) ? Guid.NewGuid().ToString() : dbName)
            .Options;
        return new IdentityDbContext(options);
    }

    private AuthService CreateService(IdentityDbContext context)
        => new(context, _jwtUtilMock.Object, _passwordUtilMock.Object);

    private static Account CreateAccount(int id = 1, string email = "test@example.com",
        UserRole role = UserRole.Staff) => new()
        {
            Id = id,
            Name = "Test User",
            Email = email,
            Password = "hashed_password",
            Role = role,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

    // â”€â”€ LoginAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsLoginResponseWithTokens()
    {
        // Arrange
        await using var ctx = CreateContext();
        ctx.Accounts.Add(CreateAccount());
        await ctx.SaveChangesAsync();

        _passwordUtilMock.Setup(p => p.Verify("pass123", "hashed_password")).Returns(true);
        _jwtUtilMock.Setup(j => j.GenerateAccessToken(It.IsAny<Account>())).Returns("access_tok");
        _jwtUtilMock.Setup(j => j.GenerateRefreshToken(It.IsAny<Account>())).Returns("refresh_tok");

        var svc = CreateService(ctx);

        // Act
        var result = await svc.LoginAsync(new LoginRequest("test@example.com", "pass123"));

        // Assert
        result.AccessToken.Should().Be("access_tok");
        result.RefreshToken.Should().Be("refresh_tok");
        result.Account.Email.Should().Be("test@example.com");
        result.Account.Role.Should().Be("Staff");

        // RefreshToken must be persisted in DB
        ctx.RefreshTokens.Should().ContainSingle(rt => rt.Token == "refresh_tok");
    }

    [Fact]
    public async Task LoginAsync_EmailCaseInsensitive_FindsAccount()
    {
        // Arrange
        await using var ctx = CreateContext();
        ctx.Accounts.Add(CreateAccount(email: "user@example.com"));
        await ctx.SaveChangesAsync();

        _passwordUtilMock.Setup(p => p.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(true);
        _jwtUtilMock.Setup(j => j.GenerateAccessToken(It.IsAny<Account>())).Returns("tok");
        _jwtUtilMock.Setup(j => j.GenerateRefreshToken(It.IsAny<Account>())).Returns("ref");

        var svc = CreateService(ctx);

        // Act â€“ note uppercase in request
        var result = await svc.LoginAsync(new LoginRequest("USER@EXAMPLE.COM", "pass"));

        // Assert â€“ should still find the account (service calls .ToLower())
        result.Account.Email.Should().Be("user@example.com");
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        await using var ctx = CreateContext();
        ctx.Accounts.Add(CreateAccount());
        await ctx.SaveChangesAsync();

        _passwordUtilMock.Setup(p => p.Verify(It.IsAny<string>(), "hashed_password")).Returns(false);

        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.LoginAsync(new LoginRequest("test@example.com", "wrong")))
            .Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Email or password incorrect");
    }

    // â”€â”€ NOTE: Bug in AuthService.LoginAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // When the account is not found, the code calls Console.WriteLine(account.Email)
    // BEFORE the null check, causing NullReferenceException instead of the intended
    // UnauthorizedAccessException. This test documents the actual (buggy) behaviour.
    [Fact]
    public async Task LoginAsync_NonExistentEmail_ThrowsNullReferenceException_Bug()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        // Act & Assert â€“ NullReferenceException due to `account.Email` before null check
        await svc.Invoking(s => s.LoginAsync(new LoginRequest("ghost@example.com", "x")))
            .Should().ThrowAsync<NullReferenceException>();
    }

    // â”€â”€ RefreshTokenAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task RefreshTokenAsync_ValidToken_ReturnsNewTokenPair()
    {
        // Arrange
        await using var ctx = CreateContext();
        var account = CreateAccount();
        ctx.Accounts.Add(account);
        ctx.RefreshTokens.Add(new RefreshToken
        {
            Token = "valid_rt",
            AccountId = 1,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        });
        await ctx.SaveChangesAsync();

        _jwtUtilMock.Setup(j => j.GenerateAccessToken(It.IsAny<Account>())).Returns("new_at");
        _jwtUtilMock.Setup(j => j.GenerateRefreshToken(It.IsAny<Account>())).Returns("new_rt");

        var svc = CreateService(ctx);

        // Act
        var result = await svc.RefreshTokenAsync("valid_rt");

        // Assert
        result.AccessToken.Should().Be("new_at");
        result.RefreshToken.Should().Be("new_rt");

        // Old token must be consumed (hard-delete)
        ctx.RefreshTokens.Should().NotContain(rt => rt.Token == "valid_rt");
        ctx.RefreshTokens.Should().ContainSingle(rt => rt.Token == "new_rt");
    }

    [Fact]
    public async Task RefreshTokenAsync_ExpiredToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        await using var ctx = CreateContext();
        ctx.Accounts.Add(CreateAccount());
        ctx.RefreshTokens.Add(new RefreshToken
        {
            Token = "expired_rt",
            AccountId = 1,
            ExpiresAt = DateTime.UtcNow.AddDays(-1),   // already expired
            CreatedAt = DateTime.UtcNow.AddDays(-8)
        });
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.RefreshTokenAsync("expired_rt"))
            .Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Refresh token invalid or expired");
    }

    [Fact]
    public async Task RefreshTokenAsync_UnknownToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.RefreshTokenAsync("does_not_exist"))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // â”€â”€ LogoutAsync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task LogoutAsync_ValidToken_DeletesTokenFromDb()
    {
        // Arrange
        await using var ctx = CreateContext();
        ctx.Accounts.Add(CreateAccount());
        ctx.RefreshTokens.Add(new RefreshToken
        {
            Token = "rt_to_delete",
            AccountId = 1,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        });
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);

        // Act
        await svc.LogoutAsync("rt_to_delete");

        // Assert
        ctx.RefreshTokens.Should().BeEmpty();
    }

    [Fact]
    public async Task LogoutAsync_UnknownToken_DoesNotThrow()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        // Act & Assert â€“ should silently ignore unknown token
        await svc.Invoking(s => s.LogoutAsync("phantom_token"))
            .Should().NotThrowAsync();
    }
}
