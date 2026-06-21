using FluentAssertions;
using Identity.API.Application.DTOs;
using Identity.API.Application.Interfaces;
using Identity.API.Application.Services;
using Identity.API.Domain.Entities;
using Identity.API.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Moq;
using Shared.DTOs;

namespace Identity.API.Tests.Unit.Services;

public class AccountServiceTests
{
    private readonly Mock<IPasswordUtil> _passwordMock = new();


    private static IdentityDbContext CreateContext()
    {
        var opts = new DbContextOptionsBuilder<IdentityDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new IdentityDbContext(opts);
    }

    private AccountService CreateService(IdentityDbContext ctx)
        => new(ctx, _passwordMock.Object);

    private static Account SeedAccount(IdentityDbContext ctx, int id = 1,
        string name = "Alice", string email = "alice@example.com",
        UserRole role = UserRole.Staff)
    {
        var account = new Account
        {
            Id = id,
            Name = name,
            Email = email,
            Password = "hash",
            Role = role,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        ctx.Accounts.Add(account);
        ctx.SaveChanges();
        return account;
    }


    [Fact]
    public async Task GetAllAsync_ReturnsPagedResult()
    {
        // Arrange
        await using var ctx = CreateContext();
        for (var i = 1; i <= 5; i++)
            SeedAccount(ctx, id: i, email: $"user{i}@x.com");

        var svc = CreateService(ctx);

        // Act
        var result = await svc.GetAllAsync(new PaginationParams(Page: 1, PageSize: 3));

        // Assert
        result.Data.Should().HaveCount(3);
        result.Total.Should().Be(5);
        result.TotalPages.Should().Be(2);
        result.HasNext.Should().BeTrue();
        result.HasPrev.Should().BeFalse();
    }

    [Fact]
    public async Task GetAllAsync_SecondPage_ReturnsRemainingItems()
    {
        // Arrange
        await using var ctx = CreateContext();
        for (var i = 1; i <= 5; i++)
            SeedAccount(ctx, id: i, email: $"u{i}@x.com");

        var svc = CreateService(ctx);

        // Act
        var result = await svc.GetAllAsync(new PaginationParams(Page: 2, PageSize: 3));

        // Assert
        result.Data.Should().HaveCount(2);
        result.HasPrev.Should().BeTrue();
        result.HasNext.Should().BeFalse();
    }


    [Fact]
    public async Task GetByIdAsync_ExistingId_ReturnsAccountDto()
    {
        // Arrange
        await using var ctx = CreateContext();
        SeedAccount(ctx, id: 7, name: "Bob", email: "bob@x.com", role: UserRole.Admin);
        var svc = CreateService(ctx);

        // Act
        var result = await svc.GetByIdAsync(7);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(7);
        result.Name.Should().Be("Bob");
        result.Role.Should().Be("Admin");
    }

    [Fact]
    public async Task GetByIdAsync_NonExistingId_ReturnsNull()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        // Act
        var result = await svc.GetByIdAsync(999);

        // Assert
        result.Should().BeNull();
    }


    [Fact]
    public async Task GetProfileAsync_ExistingAccount_ReturnsDto()
    {
        // Arrange
        await using var ctx = CreateContext();
        SeedAccount(ctx, id: 3, name: "Carol");
        var svc = CreateService(ctx);

        // Act
        var result = await svc.GetProfileAsync(3);

        // Assert
        result.Name.Should().Be("Carol");
    }

    [Fact]
    public async Task GetProfileAsync_MissingAccount_ThrowsKeyNotFoundException()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.GetProfileAsync(999))
            .Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Account isn't exists");
    }


    [Fact]
    public async Task UpdateProfileAsync_ValidData_UpdatesNameAndAvatar()
    {
        // Arrange
        await using var ctx = CreateContext();
        SeedAccount(ctx, id: 1, name: "Old Name");
        var svc = CreateService(ctx);

        // Act
        var result = await svc.UpdateProfileAsync(1,
            new UpdateProfileRequest("New Name", "/img/avatar.png"));

        // Assert
        result.Name.Should().Be("New Name");
        result.Avatar.Should().Be("/img/avatar.png");

        var inDb = await ctx.Accounts.FindAsync(1);
        inDb!.Name.Should().Be("New Name");
    }

    [Fact]
    public async Task UpdateProfileAsync_MissingAccount_ThrowsKeyNotFoundException()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.UpdateProfileAsync(99, new UpdateProfileRequest("X", null)))
            .Should().ThrowAsync<KeyNotFoundException>();
    }


    [Fact]
    public async Task ChangePasswordAsync_ValidOldPassword_UpdatesHashAndClearsTokens()
    {
        // Arrange
        await using var ctx = CreateContext();
        SeedAccount(ctx, id: 1);
        ctx.RefreshTokens.Add(new RefreshToken
        {
            Token = "rt1",
            AccountId = 1,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        });
        await ctx.SaveChangesAsync();

        _passwordMock.Setup(p => p.Verify("oldPass", "hash")).Returns(true);
        _passwordMock.Setup(p => p.Hash("newPass")).Returns("new_hash");

        var svc = CreateService(ctx);

        // Act
        await svc.ChangePasswordAsync(1, new ChangePasswordRequest("oldPass", "newPass", "newPass"));

        // Assert
        var account = await ctx.Accounts.FindAsync(1);
        account!.Password.Should().Be("new_hash");

        // All refresh tokens for the account must be revoked
        ctx.RefreshTokens.Where(rt => rt.AccountId == 1).Should().BeEmpty();
    }

    [Fact]
    public async Task ChangePasswordAsync_WrongOldPassword_ThrowsUnauthorized()
    {
        // Arrange
        await using var ctx = CreateContext();
        SeedAccount(ctx, id: 1);
        _passwordMock.Setup(p => p.Verify("wrong", "hash")).Returns(false);
        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.ChangePasswordAsync(1,
                new ChangePasswordRequest("wrong", "newPass", "newPass")))
            .Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Old password is incorrect");
    }

    [Fact]
    public async Task ChangePasswordAsync_PasswordConfirmMismatch_ThrowsArgumentException()
    {
        // Arrange
        await using var ctx = CreateContext();
        SeedAccount(ctx, id: 1);
        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.ChangePasswordAsync(1,
                new ChangePasswordRequest("old", "newPass", "DIFFERENT")))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("Password");
    }


    [Fact]
    public async Task CreateAdminAsync_UniqueEmail_CreatesAdminAccount()
    {
        // Arrange
        await using var ctx = CreateContext();
        _passwordMock.Setup(p => p.Hash(It.IsAny<string>())).Returns("hashed");
        var svc = CreateService(ctx);

        // Act
        var result = await svc.CreateAdminAsync(
            new CreateAdminRequest("Admin One", "admin@x.com", "Pass1!", "Pass1!"));

        // Assert
        result.Role.Should().Be("Admin");
        result.Email.Should().Be("admin@x.com");
        ctx.Accounts.Should().ContainSingle();
    }

    [Fact]
    public async Task CreateAdminAsync_DuplicateEmail_ThrowsArgumentException()
    {
        // Arrange
        await using var ctx = CreateContext();
        SeedAccount(ctx, email: "dup@x.com");
        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.CreateAdminAsync(
                new CreateAdminRequest("Another", "dup@x.com", "P!", "P!")))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Email already exists*");
    }

    [Fact]
    public async Task CreateAdminAsync_PasswordMismatch_ThrowsArgumentException()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.CreateAdminAsync(
                new CreateAdminRequest("X", "x@x.com", "abc", "xyz")))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Password confirmation does not match*");
    }


    [Fact]
    public async Task CreateStaffAsync_UniqueEmail_CreatesStaffRole()
    {
        // Arrange
        await using var ctx = CreateContext();
        _passwordMock.Setup(p => p.Hash(It.IsAny<string>())).Returns("h");
        var svc = CreateService(ctx);

        // Act
        var result = await svc.CreateStaffAsync(
            new CreateStaffRequest("Staff One", "staff@x.com", "P1!", "P1!"));

        // Assert
        result.Role.Should().Be("Staff");
    }


    [Fact]
    public async Task UpdateEmployeeAsync_ExistingAccount_UpdatesFields()
    {
        // Arrange
        await using var ctx = CreateContext();
        SeedAccount(ctx, id: 5, name: "Old", email: "old@x.com");
        var svc = CreateService(ctx);

        // Act
        var result = await svc.UpdateEmployeeAsync(5,
            new UpdateEmployeeRequest("New Name", "new@x.com", "/avatar.jpg"));

        // Assert
        result.Name.Should().Be("New Name");
        result.Email.Should().Be("new@x.com");
        result.Avatar.Should().Be("/avatar.jpg");
    }


    [Fact]
    public async Task DeleteAsync_ExistingAccount_RemovesAndReturnsDto()
    {
        // Arrange
        await using var ctx = CreateContext();
        SeedAccount(ctx, id: 10, name: "ToDelete");
        var svc = CreateService(ctx);

        // Act
        var result = await svc.DeleteAsync(10);

        // Assert
        result.Name.Should().Be("ToDelete");
        ctx.Accounts.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteAsync_MissingAccount_ThrowsKeyNotFoundException()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.DeleteAsync(999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }
}
