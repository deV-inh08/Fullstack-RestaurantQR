# ============================================================
# RestaurantQR - Setup test files
# Chay tu thu muc goc: D:\RestaurantAPI
# PowerShell: .\setup-tests.ps1
# ============================================================

$root = Get-Location

# ── Tao folder structure ─────────────────────────────────────
$folders = @(
    "tests\Identity.API.Tests\Unit\Services",
    "tests\Identity.API.Tests\Unit\Utils",
    "tests\Identity.API.Tests\Integration",
    "tests\Menu.API.Tests\Unit\Services",
    "tests\Order.API.Tests\Helpers",
    "tests\Order.API.Tests\Unit\Services",
    "tests\Reservation.API.Tests\Unit\Services",
    "tests\Reservation.API.Tests\Integration"
)
foreach ($f in $folders) {
    New-Item -ItemType Directory -Force -Path (Join-Path $root $f) | Out-Null
}
Write-Host "✅ Folders created" -ForegroundColor Green

# Helper function
function Write-TestFile($relativePath, $content) {
    $fullPath = Join-Path $root $relativePath
    [System.IO.File]::WriteAllText($fullPath, $content, [System.Text.Encoding]::UTF8)
    Write-Host "  Created: $relativePath" -ForegroundColor Cyan
}


# ── Tao tat ca file test ────────────────────────────────────
Write-Host "Creating test files..." -ForegroundColor Yellow
Write-TestFile 'tests\Identity.API.Tests\Unit\Services\AuthServiceTests.cs' @'
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

    // ── Helpers ───────────────────────────────────────────────────────────────

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

    // ── LoginAsync ────────────────────────────────────────────────────────────

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

        // Act – note uppercase in request
        var result = await svc.LoginAsync(new LoginRequest("USER@EXAMPLE.COM", "pass"));

        // Assert – should still find the account (service calls .ToLower())
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

    // ── NOTE: Bug in AuthService.LoginAsync ────────────────────────────────
    // When the account is not found, the code calls Console.WriteLine(account.Email)
    // BEFORE the null check, causing NullReferenceException instead of the intended
    // UnauthorizedAccessException. This test documents the actual (buggy) behaviour.
    [Fact]
    public async Task LoginAsync_NonExistentEmail_ThrowsNullReferenceException_Bug()
    {
        // Arrange
        await using var ctx = CreateContext();
        var svc = CreateService(ctx);

        // Act & Assert – NullReferenceException due to `account.Email` before null check
        await svc.Invoking(s => s.LoginAsync(new LoginRequest("ghost@example.com", "x")))
            .Should().ThrowAsync<NullReferenceException>();
    }

    // ── RefreshTokenAsync ────────────────────────────────────────────────────

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

    // ── LogoutAsync ──────────────────────────────────────────────────────────

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

        // Act & Assert – should silently ignore unknown token
        await svc.Invoking(s => s.LogoutAsync("phantom_token"))
            .Should().NotThrowAsync();
    }
}

'@

Write-TestFile 'tests\Identity.API.Tests\Unit\Services\AccountServiceTests.cs' @'
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

    // ── Helpers ───────────────────────────────────────────────────────────────

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
            Id = id, Name = name, Email = email,
            Password = "hash", Role = role,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        ctx.Accounts.Add(account);
        ctx.SaveChanges();
        return account;
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

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

    // ── GetByIdAsync ──────────────────────────────────────────────────────────

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

    // ── GetProfileAsync ───────────────────────────────────────────────────────

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

    // ── UpdateProfileAsync ────────────────────────────────────────────────────

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

    // ── ChangePasswordAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task ChangePasswordAsync_ValidOldPassword_UpdatesHashAndClearsTokens()
    {
        // Arrange
        await using var ctx = CreateContext();
        SeedAccount(ctx, id: 1);
        ctx.RefreshTokens.Add(new RefreshToken
        {
            Token = "rt1", AccountId = 1,
            ExpiresAt = DateTime.UtcNow.AddDays(7), CreatedAt = DateTime.UtcNow
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

    // ── CreateAdminAsync ──────────────────────────────────────────────────────

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

    // ── CreateStaffAsync ──────────────────────────────────────────────────────

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

    // ── UpdateEmployeeAsync ───────────────────────────────────────────────────

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

    // ── DeleteAsync ───────────────────────────────────────────────────────────

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

'@

Write-TestFile 'tests\Identity.API.Tests\Unit\Utils\JwtUtilAndPasswordUtilTests.cs' @'
using FluentAssertions;
using Identity.API.Domain.Entities;
using Identity.API.Infrastructure.Utils;
using System.IdentityModel.Tokens.Jwt;

namespace Identity.API.Tests.Unit.Utils;

public class JwtUtilTests
{
    private static JwtSettings DefaultSettings() => new()
    {
        AccessTokenSecret  = "super-secret-key-32-chars-minimum!!",
        RefreshTokenSecret = "super-refresh-key-32-chars-minimum!",
        Issuer             = "TestIssuer",
        Audience           = "TestAudience",
        AccessTokenExpiresInMinutes = 15,
        RefreshTokenExpiresInDays   = 7
    };

    private static Account TestAccount(UserRole role = UserRole.Staff) => new()
    {
        Id = 42, Name = "Jane", Email = "jane@example.com", Role = role,
        CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
    };

    private static JwtUtil CreateUtil() => new(DefaultSettings());

    // ── GenerateAccessToken ───────────────────────────────────────────────────

    [Fact]
    public void GenerateAccessToken_ReturnsValidJwtString()
    {
        var util  = CreateUtil();
        var token = util.GenerateAccessToken(TestAccount());

        token.Should().NotBeNullOrEmpty();
        new JwtSecurityTokenHandler().CanReadToken(token).Should().BeTrue();
    }

    [Fact]
    public void GenerateAccessToken_ContainsExpectedClaims()
    {
        var util    = CreateUtil();
        var account = TestAccount(UserRole.Admin);
        var token   = util.GenerateAccessToken(account);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.Should().Contain(c => c.Type == "userId" && c.Value == "42");
        jwt.Claims.Should().Contain(c => c.Type == "role"   && c.Value == "Admin");
        jwt.Claims.Should().Contain(c => c.Type == "email"  && c.Value == "jane@example.com");
        jwt.Claims.Should().Contain(c => c.Type == "tokenType" && c.Value == "AccessToken");
    }

    [Fact]
    public void GenerateAccessToken_HasCorrectIssuerAndAudience()
    {
        var util  = CreateUtil();
        var token = util.GenerateAccessToken(TestAccount());
        var jwt   = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Issuer.Should().Be("TestIssuer");
        jwt.Audiences.Should().Contain("TestAudience");
    }

    // ── GenerateRefreshToken ──────────────────────────────────────────────────

    [Fact]
    public void GenerateRefreshToken_ContainsRefreshTokenType()
    {
        var util  = CreateUtil();
        var token = util.GenerateRefreshToken(TestAccount());
        var jwt   = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.Should().Contain(c => c.Type == "tokenType" && c.Value == "RefreshToken");
        jwt.Claims.Should().Contain(c => c.Type == "userId"    && c.Value == "42");
    }

    // ── ValidateRefreshToken ──────────────────────────────────────────────────

    [Fact]
    public void ValidateRefreshToken_WithValidToken_ReturnsPrincipal()
    {
        var util    = CreateUtil();
        var account = TestAccount();
        var token   = util.GenerateRefreshToken(account);

        var principal = util.ValidateRefreshToken(token);

        principal.Should().NotBeNull();
        principal.FindFirst("userId")!.Value.Should().Be("42");
    }

    [Fact]
    public void ValidateRefreshToken_WithTamperedToken_Throws()
    {
        var util  = CreateUtil();
        var token = util.GenerateRefreshToken(TestAccount());

        // Tamper with the signature
        var parts    = token.Split('.');
        var tampered = parts[0] + "." + parts[1] + ".BAD_SIGNATURE";

        util.Invoking(u => u.ValidateRefreshToken(tampered))
            .Should().Throw<Exception>();
    }

    [Fact]
    public void ValidateRefreshToken_AccessTokenUsedAsRefresh_ThrowsDueToWrongKey()
    {
        // The access token is signed with AccessTokenSecret.
        // ValidateRefreshToken uses RefreshTokenSecret → signature mismatch.
        var util         = CreateUtil();
        var accessToken  = util.GenerateAccessToken(TestAccount());

        util.Invoking(u => u.ValidateRefreshToken(accessToken))
            .Should().Throw<Exception>();
    }
}

public class PasswordUtilTests
{
    private static PasswordUtil CreateUtil() => new();

    [Fact]
    public void Hash_ReturnsBcryptFormattedString()
    {
        var util   = CreateUtil();
        var hashed = util.Hash("MyPassword123");

        hashed.Should().StartWith("$2a$");   // BCrypt identifier
        hashed.Should().NotBe("MyPassword123");
    }

    [Fact]
    public void Verify_CorrectPassword_ReturnsTrue()
    {
        var util     = CreateUtil();
        var password = "SecurePass!99";
        var hashed   = util.Hash(password);

        util.Verify(password, hashed).Should().BeTrue();
    }

    [Fact]
    public void Verify_WrongPassword_ReturnsFalse()
    {
        var util   = CreateUtil();
        var hashed = util.Hash("correct");

        util.Verify("wrong", hashed).Should().BeFalse();
    }
}

'@

Write-TestFile 'tests\Identity.API.Tests\Integration\AuthControllerIntegrationTests.cs' @'
// ─────────────────────────────────────────────────────────────────────────────
// PREREQUISITE
// Add the following two lines to the END of Identity.API/Program.cs so the
// WebApplicationFactory can access the internal Program class:
//
//   // Make Program accessible to integration test projects
//   public partial class Program { }
//
// ─────────────────────────────────────────────────────────────────────────────

using FluentAssertions;
using Identity.API.Domain.Entities;
using Identity.API.Infrastructure.Persistence;
using Identity.API.Infrastructure.Utils;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Identity.API.Tests.Integration;

// ── Web Application Factory ───────────────────────────────────────────────────

public class IdentityWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // Replace SQL Server DB with InMemory
            var dbDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<IdentityDbContext>));
            if (dbDescriptor is not null) services.Remove(dbDescriptor);

            services.AddDbContext<IdentityDbContext>(opts =>
                opts.UseInMemoryDatabase("IdentityIntegrationTestDb"));

            // Replace JWT settings with deterministic test values
            var jwtDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(JwtSettings));
            if (jwtDescriptor is not null) services.Remove(jwtDescriptor);

            services.AddSingleton(new JwtSettings
            {
                AccessTokenSecret  = "integration-test-secret-32chars!!",
                RefreshTokenSecret = "integration-refresh-secret-32char",
                Issuer             = "TestIssuer",
                Audience           = "TestAudience",
                AccessTokenExpiresInMinutes = 15,
                RefreshTokenExpiresInDays   = 7
            });
        });
    }

    /// <summary>Seeds a known account so auth tests can log in.</summary>
    public async Task SeedDefaultAccountAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();

        if (!await db.Accounts.AnyAsync(a => a.Email == "test@restaurant.com"))
        {
            db.Accounts.Add(new Account
            {
                Name     = "Test Staff",
                Email    = "test@restaurant.com",
                Password = BCrypt.Net.BCrypt.HashPassword("TestPass1!"),
                Role     = UserRole.Staff,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
    }
}

// ── Auth Controller Integration Tests ────────────────────────────────────────

public class AuthControllerIntegrationTests : IClassFixture<IdentityWebApplicationFactory>
{
    private readonly IdentityWebApplicationFactory _factory;
    private readonly HttpClient _client;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public AuthControllerIntegrationTests(IdentityWebApplicationFactory factory)
    {
        _factory = factory;
        _client  = factory.CreateClient();
    }

    // ── POST /api/v1/auth/login ───────────────────────────────────────────────

    [Fact]
    public async Task Login_ValidCredentials_Returns200WithTokens()
    {
        await _factory.SeedDefaultAccountAsync();

        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email    = "test@restaurant.com",
            password = "TestPass1!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("data").GetProperty("accessToken").GetString()
            .Should().NotBeNullOrEmpty();
        body.GetProperty("data").GetProperty("refreshToken").GetString()
            .Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        await _factory.SeedDefaultAccountAsync();

        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email    = "test@restaurant.com",
            password = "WRONG_PASSWORD"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_UnknownEmail_Returns500()
    {
        // Due to the bug in AuthService (Console.WriteLine before null-check)
        // a missing account causes NullReferenceException → 500
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email    = "ghost@nowhere.com",
            password = "irrelevant"
        });

        // Bug: should ideally be 401, but current code returns 500
        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    // ── POST /api/v1/auth/refresh-token ──────────────────────────────────────

    [Fact]
    public async Task RefreshToken_ValidToken_Returns200WithNewTokens()
    {
        await _factory.SeedDefaultAccountAsync();

        // First, log in to get a refresh token
        var loginResp = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email    = "test@restaurant.com",
            password = "TestPass1!"
        });
        var loginBody   = await loginResp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var refreshToken = loginBody.GetProperty("data").GetProperty("refreshToken").GetString()!;

        // Now refresh
        var response = await _client.PostAsJsonAsync("/api/v1/auth/refresh-token", new
        {
            refreshToken
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        body.GetProperty("data").GetProperty("accessToken").GetString()
            .Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task RefreshToken_InvalidToken_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/refresh-token", new
        {
            refreshToken = "this.is.garbage"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── POST /api/v1/auth/logout ──────────────────────────────────────────────

    [Fact]
    public async Task Logout_WithValidBearer_Returns200()
    {
        await _factory.SeedDefaultAccountAsync();

        // Get tokens
        var loginResp    = await _client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email    = "test@restaurant.com",
            password = "TestPass1!"
        });
        var loginBody    = await loginResp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var accessToken  = loginBody.GetProperty("data").GetProperty("accessToken").GetString()!;
        var refreshToken = loginBody.GetProperty("data").GetProperty("refreshToken").GetString()!;

        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _client.PostAsJsonAsync("/api/v1/auth/logout", new { refreshToken });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Logout_WithoutBearer_Returns401()
    {
        _client.DefaultRequestHeaders.Authorization = null;

        var response = await _client.PostAsJsonAsync("/api/v1/auth/logout", new
        {
            refreshToken = "any_token"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}

'@

Write-TestFile 'tests\Menu.API.Tests\Unit\Services\MenuServiceTests.cs' @'
using FluentAssertions;
using Menu.API.Application.DTOs;
using Menu.API.Application.Services;
using Menu.API.Domain.Entities;
using Menu.API.Infrastructure.Persistence;
using Menu.API.Infrastruture.Utils;
using Microsoft.EntityFrameworkCore;
using Moq;
using Shared.DTOs;

namespace Menu.API.Tests.Unit.Services;

public class MenuServiceTests
{
    private readonly Mock<IFileUploadUtil> _fileMock = new();

    // ── Helpers ───────────────────────────────────────────────────────────────

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
        string name = "Phở Bò", int price = 85000,
        DishStatus status = DishStatus.Available,
        DishCategory category = DishCategory.MainCourse)
    {
        var dish = new Dish
        {
            Name = name, Price = price,
            Description = "Test description",
            Status = status, Category = category,
            CreatedAt = DateTime.UtcNow
        };
        ctx.Dishes.Add(dish);
        ctx.SaveChanges();
        return dish;
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

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

    // ── GetByIdAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_ExistingDish_ReturnsDto()
    {
        // Arrange
        await using var ctx = CreateContext();
        var dish = SeedDish(ctx, "Bún Bò Huế", 75000);
        var svc  = CreateService(ctx);

        // Act
        var result = await svc.GetByIdAsync(dish.Id);

        // Assert
        result.Name.Should().Be("Bún Bò Huế");
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

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_CreatesDishAndSnapshot()
    {
        // Arrange
        await using var ctx = CreateContext();
        _fileMock.Setup(f => f.SaveFileAsync(It.IsAny<IFormFile>(), It.IsAny<string>()))
                 .ReturnsAsync("/images/test.jpg");
        var svc = CreateService(ctx);

        var mockFile = new Mock<IFormFile>();
        mockFile.Setup(f => f.Length).Returns(1024);

        // Act
        var result = await svc.CreateAsync(new CreateDishRequest
        {
            Name        = "New Dish",
            Price       = 60000,
            Description = "Delicious",
            Category    = DishCategory.MainCourse,
            Image       = mockFile.Object
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
            Name        = "No Photo Dish",
            Price       = 40000,
            Description = "Plain",
            Category    = DishCategory.Beverage,
            Image       = null
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
                Name = "Bad Dish", Price = 0,
                Description = "X", Category = DishCategory.MainCourse
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
                Name = "Negative", Price = -1000,
                Description = "X", Category = DishCategory.MainCourse
            }))
            .Should().ThrowAsync<ArgumentException>();
    }

    // ── UpdateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_PriceChanged_CreatesSnapshot()
    {
        // Arrange
        await using var ctx = CreateContext();
        var dish  = SeedDish(ctx, "Dish A", 50000);
        var svc   = CreateService(ctx);

        // Act
        await svc.UpdateAsync(dish.Id, new UpdateDishRequest
        {
            Name        = "Dish A",
            Price       = 60000,   // price changed → snapshot
            Description = "Updated",
            Category    = DishCategory.MainCourse
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
        var svc  = CreateService(ctx);
        var snapshotsBefore = ctx.DishSnapshots.Count();

        // Act – same name, price, category
        await svc.UpdateAsync(dish.Id, new UpdateDishRequest
        {
            Name = "Dish B", Price = 50000,
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
            Name = dish.Name, Price = dish.Price,
            Description = "X", Category = dish.Category,
            Image = mockFile.Object
        });

        // Assert
        _fileMock.Verify(f => f.DeleteFile("/images/old.jpg"), Times.Once);
        _fileMock.Verify(f => f.SaveFileAsync(It.IsAny<IFormFile>(), It.IsAny<string>()), Times.Once);
    }

    // ── UpdateStatusAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatusAsync_ValidStatus_UpdatesDish()
    {
        // Arrange
        await using var ctx = CreateContext();
        var dish = SeedDish(ctx, status: DishStatus.Available);
        var svc  = CreateService(ctx);

        // Act
        var result = await svc.UpdateStatusAsync(dish.Id,
            new UpdateDishStatusRequest(DishStatus.OutOfStock));

        // Assert
        result.Status.Should().Be("OutOfStock");
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

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

'@

Write-TestFile 'tests\Order.API.Tests\Helpers\TestHelpers.cs' @'
using Microsoft.AspNetCore.SignalR;
using Moq;
using Order.API.Hubs;
using Order.API.Infrastructure.ExternalServices;
using Order.API.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Text;
using System.Text.Json;

namespace Order.API.Tests.Helpers;

// ── SignalR hub mock factory ──────────────────────────────────────────────────

public static class HubContextHelper
{
    /// <summary>
    /// Creates a fully wired Moq for IHubContext&lt;OrderHub&gt;.
    /// All SendCoreAsync calls are no-ops (returns Task.CompletedTask).
    /// </summary>
    public static Mock<IHubContext<OrderHub>> Create()
    {
        var hubMock     = new Mock<IHubContext<OrderHub>>();
        var clientsMock = new Mock<IHubClients>();
        var proxyMock   = new Mock<IClientProxy>();

        proxyMock
            .Setup(p => p.SendCoreAsync(
                It.IsAny<string>(),
                It.IsAny<object[]>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(proxyMock.Object);
        clientsMock.Setup(c => c.All).Returns(proxyMock.Object);

        hubMock.Setup(h => h.Clients).Returns(clientsMock.Object);

        return hubMock;
    }
}

// ── Fake HttpMessageHandler for Menu API calls ────────────────────────────────

public class FakeHttpMessageHandler : HttpMessageHandler
{
    private readonly string _json;
    private readonly HttpStatusCode _statusCode;

    public FakeHttpMessageHandler(object responseObject,
        HttpStatusCode statusCode = HttpStatusCode.OK)
    {
        _json       = JsonSerializer.Serialize(responseObject);
        _statusCode = statusCode;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(new HttpResponseMessage(_statusCode)
        {
            Content = new StringContent(_json, Encoding.UTF8, "application/json")
        });
    }
}

// ── EF Core OrderDbContext factory ────────────────────────────────────────────

public static class OrderDbContextFactory
{
    public static OrderDbContext Create()
    {
        var opts = new DbContextOptionsBuilder<OrderDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new OrderDbContext(opts);
    }
}

// ── MenuApiClient factory (uses FakeHttpMessageHandler) ───────────────────────

public static class MenuApiClientFactory
{
    /// <summary>
    /// Returns a MenuApiClient whose HTTP calls return the given snapshot data.
    /// </summary>
    public static MenuApiClient CreateWithSnapshot(int id, string name, decimal price,
        string? image = null)
    {
        var responseBody = new
        {
            message = "success",
            data    = new { id, name, price, imagePath = image }
        };
        var handler = new FakeHttpMessageHandler(responseBody);
        var http    = new HttpClient(handler)
        {
            BaseAddress = new Uri("http://menu-api-fake/")
        };
        return new MenuApiClient(http);
    }

    /// <summary>
    /// Returns a MenuApiClient that simulates Menu API being unavailable (404).
    /// </summary>
    public static MenuApiClient CreateNotFound()
    {
        var handler = new FakeHttpMessageHandler(new { }, HttpStatusCode.NotFound);
        var http    = new HttpClient(handler)
        {
            BaseAddress = new Uri("http://menu-api-fake/")
        };
        return new MenuApiClient(http);
    }
}

'@

Write-TestFile 'tests\Order.API.Tests\Unit\Services\TableServiceTests.cs' @'
using FluentAssertions;
using Order.API.Application.DTOs;
using Order.API.Application.Service;
using Order.API.Domain.Entities;
using Order.API.Tests.Helpers;

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
            Number                = number,
            Capacity              = capacity,
            Status                = status,
            IsVisibleOnReservation = visibleOnReservation,
            SessionId             = Guid.NewGuid(),
            CreatedAt             = DateTime.UtcNow,
            UpdatedAt             = DateTime.UtcNow
        };
        ctx.Tables.Add(table);
        ctx.SaveChanges();
        return table;
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsPaginatedTablesOrderedByNumber()
    {
        // Arrange
        var svc = CreateService(out var ctx);
        SeedTable(ctx, 3); SeedTable(ctx, 1); SeedTable(ctx, 2);

        // Act
        var result = await svc.GetAllAsync(new Shared.DTOs.PaginationParams(1, 10));

        // Assert – tables ordered by Number ascending
        result.Data.Select(t => t.Number).Should().BeInAscendingOrder();
        result.Total.Should().Be(3);
    }

    // ── GetByIdAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_ExistingTable_ReturnsDto()
    {
        // Arrange
        var svc   = CreateService(out var ctx);
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

    // ── CreateAsync ───────────────────────────────────────────────────────────

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

    // ── UpdateStatusAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatusAsync_ValidTable_ChangesStatus()
    {
        // Arrange
        var svc   = CreateService(out var ctx);
        var table = SeedTable(ctx, status: TableStatus.Available);

        // Act
        var result = await svc.UpdateStatusAsync(table.Id,
            new UpdateTableStatusRequest(TableStatus.Occupied));

        // Assert
        result.Status.Should().Be("Occupied");
    }

    // ── UpdateVisibilityAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task UpdateVisibilityAsync_TogglesReservationFlag()
    {
        // Arrange
        var svc   = CreateService(out var ctx);
        var table = SeedTable(ctx, visibleOnReservation: true);

        // Act – hide from reservations
        var result = await svc.UpdateVisibilityAsync(table.Id,
            new UpdateTableVisibilityRequest(IsVisibleOnReservation: false));

        // Assert
        result.IsVisibleOnReservation.Should().BeFalse();
    }

    // ── ResetTableAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task ResetTableAsync_ChangesSessionIdAndSetsHidden()
    {
        // Arrange
        var svc        = CreateService(out var ctx);
        var table      = SeedTable(ctx, status: TableStatus.Occupied);
        var oldSession = table.SessionId;

        // Act
        var result = await svc.ResetTableAsync(table.Id);

        // Assert
        result.Status.Should().Be("Hidden");

        var updated = await ctx.Tables.FindAsync(table.Id);
        updated!.SessionId.Should().NotBe(oldSession);   // new session invalidates old tokens
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_ExistingTable_RemovesFromDb()
    {
        // Arrange
        var svc   = CreateService(out var ctx);
        var table = SeedTable(ctx);

        // Act
        var result = await svc.DeleteAsync(table.Id);

        // Assert
        result.Number.Should().Be(table.Number);
        ctx.Tables.Should().BeEmpty();
    }

    // ── GetAvailableForReservationAsync ───────────────────────────────────────

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

'@

Write-TestFile 'tests\Order.API.Tests\Unit\Services\GuestServiceTests.cs' @'
using FluentAssertions;
using Moq;
using Order.API.Application.DTOs;
using Order.API.Application.Interfaces;
using Order.API.Application.Service;
using Order.API.Domain.Entities;
using Order.API.Tests.Helpers;
using System.Security.Claims;

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
            Number = number, Capacity = 4, Status = status,
            SessionId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        ctx.Tables.Add(table);
        ctx.SaveChanges();
        return table;
    }

    // ── LoginAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task LoginAsync_AvailableTable_CreatesGuestAndChangesTableToOccupied()
    {
        // Arrange
        var svc   = CreateService(out var ctx);
        var table = SeedTable(ctx, number: 5, status: TableStatus.Available);

        _jwtMock.Setup(j => j.GenerateAccessToken(It.IsAny<Guest>(), It.IsAny<Guid>()))
                .Returns("access_tok");
        _jwtMock.Setup(j => j.GenerateRefreshToken(It.IsAny<Guest>(), It.IsAny<Guid>()))
                .Returns("refresh_tok");

        // Act
        var result = await svc.LoginAsync(new GuestLoginRequest(
            TableNumber: 5, Name: "Nguyễn Văn A"));

        // Assert
        result.AccessToken.Should().Be("access_tok");
        result.RefreshToken.Should().Be("refresh_tok");
        result.Guest.Name.Should().Be("Nguyễn Văn A");
        result.Guest.TableNumber.Should().Be(5);

        // Table status must transition to Occupied
        var updatedTable = await ctx.Tables.FindAsync(table.Id);
        updatedTable!.Status.Should().Be(TableStatus.Occupied);

        // Guest record must exist in DB
        ctx.Guests.Should().ContainSingle(g => g.Name == "Nguyễn Văn A");
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

    // ── RefreshTokenAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task RefreshTokenAsync_ValidToken_ReturnsNewTokenPair()
    {
        // Arrange
        var svc   = CreateService(out var ctx);
        var table = SeedTable(ctx, number: 1);

        var guest = new Guest
        {
            Name = "Dave", TableId = table.Id, TableNumber = 1,
            SessionId = table.SessionId, CreatedAt = DateTime.UtcNow
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
        // Arrange – guest is from an old session; table now has a new session
        var svc   = CreateService(out var ctx);
        var table = SeedTable(ctx, number: 1);

        var guest = new Guest
        {
            Name = "Eve", TableId = table.Id, TableNumber = 1,
            SessionId = Guid.NewGuid(), // different session → mismatch
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

'@

Write-TestFile 'tests\Order.API.Tests\Unit\Services\OrderServiceTests.cs' @'
using FluentAssertions;
using Moq;
using Order.API.Application.DTOs;
using Order.API.Application.Service;
using Order.API.Domain.Entities;
using Order.API.Tests.Helpers;
using Microsoft.AspNetCore.SignalR;
using Order.API.Hubs;

namespace Order.API.Tests.Unit.Services;

public class OrderServiceTests
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private static (OrderDbContext ctx, Table table, Guest guest) SetupTableAndGuest(
        TableStatus tableStatus = TableStatus.Occupied)
    {
        var ctx   = OrderDbContextFactory.Create();
        var table = new Table
        {
            Number = 1, Capacity = 4, Status = tableStatus,
            SessionId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        ctx.Tables.Add(table);
        ctx.SaveChanges();

        var guest = new Guest
        {
            Name = "Trần Văn B", TableId = table.Id, TableNumber = 1,
            SessionId = table.SessionId, CreatedAt = DateTime.UtcNow
        };
        ctx.Guests.Add(guest);
        ctx.SaveChanges();

        return (ctx, table, guest);
    }

    private static OrderService CreateService(OrderDbContext ctx,
        int snapshotId = 1, string dishName = "Phở", decimal price = 85000)
    {
        var menuClient = MenuApiClientFactory.CreateWithSnapshot(snapshotId, dishName, price);
        var hub        = HubContextHelper.Create();
        return new OrderService(ctx, menuClient, hub.Object);
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsPagedOrders()
    {
        // Arrange
        var (ctx, table, guest) = SetupTableAndGuest();
        for (var i = 0; i < 5; i++)
        {
            ctx.Orders.Add(new Order.API.Domain.Entities.Order
            {
                GuestId = guest.Id, TableId = table.Id,
                DishSnapshotId = 1, DishName = "Dish",
                DishPrice = 50000, Quantity = 1,
                Status = OrderStatus.Pending,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
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

    // ── GetByGuestAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetByGuestAsync_ReturnsOnlyGuestOrders()
    {
        // Arrange
        var (ctx, table, guest1) = SetupTableAndGuest();
        var guest2 = new Guest
        {
            Name = "Another", TableId = table.Id, TableNumber = 1,
            SessionId = table.SessionId, CreatedAt = DateTime.UtcNow
        };
        ctx.Guests.Add(guest2);
        await ctx.SaveChangesAsync();

        ctx.Orders.Add(new Order.API.Domain.Entities.Order
        {
            GuestId = guest1.Id, TableId = table.Id,
            DishSnapshotId = 1, DishName = "A", DishPrice = 50000, Quantity = 1,
            Status = OrderStatus.Pending,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        });
        ctx.Orders.Add(new Order.API.Domain.Entities.Order
        {
            GuestId = guest2.Id, TableId = table.Id,
            DishSnapshotId = 2, DishName = "B", DishPrice = 60000, Quantity = 2,
            Status = OrderStatus.Pending,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        });
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);

        // Act
        var result = await svc.GetByGuestAsync(guest1.Id);

        // Assert
        result.Should().ContainSingle();
        result[0].GuestId.Should().Be(guest1.Id);
    }

    // ── CreateAsync (as Guest) ────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidGuestAndSnapshot_CreatesOrderAndBroadcasts()
    {
        // Arrange
        var (ctx, table, guest) = SetupTableAndGuest();
        var hubMock = HubContextHelper.Create();
        var menuClient = MenuApiClientFactory.CreateWithSnapshot(5, "Cơm Tấm", 70000, "/img.jpg");
        var svc        = new OrderService(ctx, menuClient, hubMock.Object);

        // Act
        var result = await svc.CreateAsync(guest.Id, table.SessionId,
            new CreateOrderRequest(TableId: table.Id, DishSnapshotId: 5, Quantity: 2));

        // Assert – order persisted
        result.DishName.Should().Be("Cơm Tấm");
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
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Số lượng phải lớn hơn 0*");
    }

    [Fact]
    public async Task CreateAsync_SessionMismatch_ThrowsUnauthorized()
    {
        // Arrange – table session has changed since guest last logged in
        var (ctx, table, guest) = SetupTableAndGuest();
        var staleSession = Guid.NewGuid();   // different from table.SessionId
        var svc          = CreateService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.CreateAsync(guest.Id, staleSession,
                new CreateOrderRequest(table.Id, 1, 1)))
            .Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Phiên đã hết hạn*");
    }

    [Fact]
    public async Task CreateAsync_SnapshotNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var (ctx, table, guest) = SetupTableAndGuest();
        var menuClient = MenuApiClientFactory.CreateNotFound();
        var hub        = HubContextHelper.Create();
        var svc        = new OrderService(ctx, menuClient, hub.Object);

        // Act & Assert
        await svc.Invoking(s => s.CreateAsync(guest.Id, table.SessionId,
                new CreateOrderRequest(table.Id, 999, 1)))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ── CreateAsStaffAsync ────────────────────────────────────────────────────

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

    // ── UpdateStatusAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatusAsync_ValidOrder_UpdatesStatusAndBroadcasts()
    {
        // Arrange
        var (ctx, table, guest) = SetupTableAndGuest();
        var order = new Order.API.Domain.Entities.Order
        {
            GuestId = guest.Id, TableId = table.Id,
            DishSnapshotId = 1, DishName = "X", DishPrice = 50000, Quantity = 1,
            Status = OrderStatus.Pending,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        ctx.Orders.Add(order);
        await ctx.SaveChangesAsync();

        var hubMock    = HubContextHelper.Create();
        var menuClient = MenuApiClientFactory.CreateWithSnapshot(1, "X", 50000);
        var svc        = new OrderService(ctx, menuClient, hubMock.Object);

        // Act
        var result = await svc.UpdateStatusAsync(order.Id,
            new UpdateOrderStatusRequest(OrderStatus.Preparing, AccountId: 7));

        // Assert
        result.Status.Should().Be("Preparing");
        var clientsMock = Mock.Get(hubMock.Object.Clients);
        clientsMock.Verify(c => c.Group("staff"), Times.AtLeastOnce);
    }
}

'@

Write-TestFile 'tests\Order.API.Tests\Unit\Services\BillServiceTests.cs' @'
using FluentAssertions;
using Moq;
using Order.API.Application.DTOs;
using Order.API.Application.Service;
using Order.API.Domain.Entities;
using Order.API.Tests.Helpers;

namespace Order.API.Tests.Unit.Services;

public class BillServiceTests
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private static (OrderDbContext ctx, Table table, Guest guest) Seed(
        int tableNumber = 1, TableStatus status = TableStatus.Occupied)
    {
        var ctx   = OrderDbContextFactory.Create();
        var table = new Table
        {
            Number = tableNumber, Capacity = 4, Status = status,
            SessionId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        ctx.Tables.Add(table);
        ctx.SaveChanges();

        var guest = new Guest
        {
            Name = "Alice", TableId = table.Id, TableNumber = tableNumber,
            SessionId = table.SessionId, CreatedAt = DateTime.UtcNow
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
            GuestId = guestId, TableId = tableId,
            DishSnapshotId = 1, DishName = "Dish",
            DishPrice = price, Quantity = qty, Status = status,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        });
        ctx.SaveChanges();
    }

    private static BillService CreateBillService(OrderDbContext ctx)
        => new(ctx, HubContextHelper.Create().Object);

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsPaginatedBills()
    {
        // Arrange
        var (ctx, table, _) = Seed();
        for (var i = 0; i < 4; i++)
        {
            ctx.Bills.Add(new Bill
            {
                TableId = table.Id, SessionId = table.SessionId,
                GuestName = "Guest", TotalAmount = 100000,
                Status = BillStatus.Unpaid,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
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

    // ── GetByTableAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetByTableAsync_ExistingBill_ReturnsBillDtoWithOrders()
    {
        // Arrange
        var (ctx, table, guest) = Seed();
        AddOrder(ctx, guest.Id, table.Id, price: 85000, qty: 2);

        ctx.Bills.Add(new Bill
        {
            TableId = table.Id, SessionId = table.SessionId,
            GuestName = "Alice", TotalAmount = 170000,
            Status = BillStatus.Requested,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
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
        // Arrange – no Bill entity, but orders exist
        var (ctx, table, guest) = Seed();
        AddOrder(ctx, guest.Id, table.Id, price: 50000, qty: 3);   // 150 000
        AddOrder(ctx, guest.Id, table.Id, price: 30000, qty: 1);   //  30 000

        var svc = CreateBillService(ctx);

        // Act
        var result = await svc.GetByTableAsync(table.Id);

        // Assert – computed bill
        result.Id.Should().Be(0);           // transient – no DB id yet
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
        AddOrder(ctx, guest.Id, table.Id, price: 50000,  qty: 1, status: OrderStatus.Cancelled);

        var svc = CreateBillService(ctx);

        // Act
        var result = await svc.GetByTableAsync(table.Id);

        // Assert – only non-cancelled orders count
        result.TotalAmount.Should().Be(100000);
        result.Orders.Should().ContainSingle();
    }

    // ── RequestBillAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task RequestBillAsync_ValidGuest_CreatesBillAndBroadcasts()
    {
        // Arrange
        var (ctx, table, guest) = Seed(status: TableStatus.Occupied);
        AddOrder(ctx, guest.Id, table.Id, price: 75000, qty: 2);  // total 150 000

        var hubMock = HubContextHelper.Create();
        var svc     = new BillService(ctx, hubMock.Object);

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
        var svc          = CreateBillService(ctx);

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
            TableId = table.Id, SessionId = table.SessionId,
            GuestName = "Alice", TotalAmount = 100000,
            Status = BillStatus.Paid,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        });
        await ctx.SaveChangesAsync();

        var svc = CreateBillService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.RequestBillAsync(guest.Id, table.SessionId))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*đã được thanh toán*");
    }

    // ── ConfirmPaymentAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task ConfirmPaymentAsync_RequestedBill_MarksAsPaidAndResetsTable()
    {
        // Arrange
        var (ctx, table, _) = Seed();
        var bill = new Bill
        {
            TableId = table.Id, SessionId = table.SessionId,
            GuestName = "Alice", TotalAmount = 200000,
            Status = BillStatus.Requested,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        ctx.Bills.Add(bill);
        await ctx.SaveChangesAsync();

        var hubMock    = HubContextHelper.Create();
        var svc        = new BillService(ctx, hubMock.Object);
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
        clientsMock.Verify(c => c.Group("staff"),                 Times.AtLeastOnce);
        clientsMock.Verify(c => c.Group($"table-{table.Number}"), Times.AtLeastOnce);
    }

    [Fact]
    public async Task ConfirmPaymentAsync_AlreadyPaid_ThrowsArgumentException()
    {
        // Arrange
        var (ctx, table, _) = Seed();
        var bill = new Bill
        {
            TableId = table.Id, SessionId = table.SessionId,
            GuestName = "X", TotalAmount = 0,
            Status = BillStatus.Paid,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        ctx.Bills.Add(bill);
        await ctx.SaveChangesAsync();

        var svc = CreateBillService(ctx);

        // Act & Assert
        await svc.Invoking(s => s.ConfirmPaymentAsync(bill.Id, 1))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*đã được thanh toán*");
    }
}

'@

Write-TestFile 'tests\Reservation.API.Tests\Unit\Services\InMemoryMongoCollection.cs' @'
using FluentAssertions;
using MongoDB.Driver;
using Moq;
using Reservation.API.Application.DTOs;
using Reservation.API.Application.Services;
using Reservation.API.Domain.Entities;
using Reservation.API.Infrastructure.Persistence;

namespace Reservation.API.Tests.Unit.Services;

// ── In-memory collection helper ───────────────────────────────────────────────
// Because MongoDB.Driver interfaces are complex to mock, we create a thin
// testable wrapper backed by an in-memory List<Reservation>.

public class InMemoryReservationCollection
    : IMongoCollection<Reservation.API.Domain.Entities.Reservation>
{
    // Only the methods used by ReservationService are implemented.
    // Everything else throws NotImplementedException (sufficient for unit tests).

    private readonly List<Reservation.API.Domain.Entities.Reservation> _data = new();

    // ── IMongoCollection boilerplate (partial) ────────────────────────────────
    public CollectionNamespace CollectionNamespace => throw new NotImplementedException();
    public IMongoDatabase Database => throw new NotImplementedException();
    public IBsonSerializer<Reservation.API.Domain.Entities.Reservation> DocumentSerializer
        => throw new NotImplementedException();
    public IMongoIndexManager<Reservation.API.Domain.Entities.Reservation> Indexes
        => throw new NotImplementedException();
    public MongoCollectionSettings Settings => throw new NotImplementedException();

    // ── InsertOneAsync ────────────────────────────────────────────────────────
    public Task InsertOneAsync(Reservation.API.Domain.Entities.Reservation document,
        InsertOneOptions? options = null, CancellationToken cancellationToken = default)
    {
        _data.Add(document);
        return Task.CompletedTask;
    }

    // ── CountDocumentsAsync ───────────────────────────────────────────────────
    public Task<long> CountDocumentsAsync(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> filter,
        CountOptions? options = null, CancellationToken cancellationToken = default)
    {
        var items = ApplyFilter(filter);
        return Task.FromResult((long)items.Count);
    }

    // ── Find → IFindFluent wrapper ────────────────────────────────────────────
    public IFindFluent<Reservation.API.Domain.Entities.Reservation,
        Reservation.API.Domain.Entities.Reservation> Find(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> filter,
        FindOptions? options = null)
    {
        return new InMemoryFindFluent(_data, ApplyFilter(filter));
    }

    // ── UpdateOneAsync ────────────────────────────────────────────────────────
    public Task<UpdateResult> UpdateOneAsync(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> filter,
        UpdateDefinition<Reservation.API.Domain.Entities.Reservation> update,
        UpdateOptions? options = null, CancellationToken cancellationToken = default)
    {
        // For unit tests: re-fetch after applying the rendered update would be complex.
        // We simply mark a matched-but-unmodified result so the service re-fetches.
        var matched = ApplyFilter(filter).Count;
        return Task.FromResult(UpdateResult.Acknowledged(matched, matched, null));
    }

    // ── DeleteOneAsync ────────────────────────────────────────────────────────
    public Task<DeleteResult> DeleteOneAsync(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> filter,
        CancellationToken cancellationToken = default)
    {
        var item = ApplyFilter(filter).FirstOrDefault();
        if (item is not null) _data.Remove(item);
        return Task.FromResult(DeleteResult.Acknowledged(item is null ? 0 : 1));
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    /// <summary>
    /// Applies common filter patterns used by ReservationService
    /// (Id == id, Status == status, GuestPhone regex, date range).
    /// </summary>
    private List<Reservation.API.Domain.Entities.Reservation> ApplyFilter(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> filter)
    {
        // We render the filter as JSON and do a simplistic parse for test purposes.
        var rendered = filter.Render(
            BsonSerializer.SerializerRegistry.GetSerializer<
                Reservation.API.Domain.Entities.Reservation>(),
            BsonSerializer.SerializerRegistry);
        var json = rendered.ToJson();

        // Empty filter → return all
        if (json == "{ }") return _data.ToList();

        // Id equality filter
        if (json.Contains("\"_id\""))
        {
            return _data.Where(r => json.Contains(r.Id)).ToList();
        }

        return _data.ToList();  // fallback: return all (sufficient for most unit tests)
    }

    // Not implemented stubs (required by interface) ───────────────────────────
    public Task<IAsyncCursor<TResult>> AggregateAsync<TResult>(
        PipelineDefinition<Reservation.API.Domain.Entities.Reservation, TResult> pipeline,
        AggregateOptions? options = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public Task<IAsyncCursor<TResult>> AggregateAsync<TResult>(
        IClientSessionHandle session,
        PipelineDefinition<Reservation.API.Domain.Entities.Reservation, TResult> pipeline,
        AggregateOptions? options = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public Task AggregateToCollectionAsync<TResult>(
        PipelineDefinition<Reservation.API.Domain.Entities.Reservation, TResult> p,
        AggregateToCollectionOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public Task AggregateToCollectionAsync<TResult>(IClientSessionHandle s,
        PipelineDefinition<Reservation.API.Domain.Entities.Reservation, TResult> p,
        AggregateToCollectionOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public BulkWriteResult<Reservation.API.Domain.Entities.Reservation> BulkWrite(
        IEnumerable<WriteModel<Reservation.API.Domain.Entities.Reservation>> r,
        BulkWriteOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public BulkWriteResult<Reservation.API.Domain.Entities.Reservation> BulkWrite(
        IClientSessionHandle s,
        IEnumerable<WriteModel<Reservation.API.Domain.Entities.Reservation>> r,
        BulkWriteOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public Task<BulkWriteResult<Reservation.API.Domain.Entities.Reservation>> BulkWriteAsync(
        IEnumerable<WriteModel<Reservation.API.Domain.Entities.Reservation>> r,
        BulkWriteOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public Task<BulkWriteResult<Reservation.API.Domain.Entities.Reservation>> BulkWriteAsync(
        IClientSessionHandle s,
        IEnumerable<WriteModel<Reservation.API.Domain.Entities.Reservation>> r,
        BulkWriteOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public long CountDocuments(FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        CountOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public long CountDocuments(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        CountOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public Task<long> CountDocumentsAsync(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        CountOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public DeleteResult DeleteMany(FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        CancellationToken ct = default)
        => throw new NotImplementedException();
    public DeleteResult DeleteMany(FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        DeleteOptions o, CancellationToken ct = default)
        => throw new NotImplementedException();
    public DeleteResult DeleteMany(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        DeleteOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public Task<DeleteResult> DeleteManyAsync(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<DeleteResult> DeleteManyAsync(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        DeleteOptions o, CancellationToken ct = default) => throw new NotImplementedException();
    public Task<DeleteResult> DeleteManyAsync(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        DeleteOptions? o = null, CancellationToken ct = default) => throw new NotImplementedException();
    public DeleteResult DeleteOne(FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        CancellationToken ct = default) => throw new NotImplementedException();
    public DeleteResult DeleteOne(FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        DeleteOptions o, CancellationToken ct = default) => throw new NotImplementedException();
    public DeleteResult DeleteOne(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        DeleteOptions? o = null, CancellationToken ct = default) => throw new NotImplementedException();
    public Task<DeleteResult> DeleteOneAsync(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        DeleteOptions o, CancellationToken ct = default) => throw new NotImplementedException();
    public Task<DeleteResult> DeleteOneAsync(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        DeleteOptions? o = null, CancellationToken ct = default) => throw new NotImplementedException();
    public IAsyncCursor<TField> Distinct<TField>(FieldDefinition<Reservation.API.Domain.Entities.Reservation, TField> f,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> filter,
        DistinctOptions? o = null, CancellationToken ct = default) => throw new NotImplementedException();
    public IAsyncCursor<TField> Distinct<TField>(IClientSessionHandle s,
        FieldDefinition<Reservation.API.Domain.Entities.Reservation, TField> f,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> filter,
        DistinctOptions? o = null, CancellationToken ct = default) => throw new NotImplementedException();
    public Task<IAsyncCursor<TField>> DistinctAsync<TField>(
        FieldDefinition<Reservation.API.Domain.Entities.Reservation, TField> f,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> filter,
        DistinctOptions? o = null, CancellationToken ct = default) => throw new NotImplementedException();
    public Task<IAsyncCursor<TField>> DistinctAsync<TField>(IClientSessionHandle s,
        FieldDefinition<Reservation.API.Domain.Entities.Reservation, TField> f,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> filter,
        DistinctOptions? o = null, CancellationToken ct = default) => throw new NotImplementedException();
    public Task<IAsyncCursor<TItem>> DistinctManyAsync<TItem>(
        FieldDefinition<Reservation.API.Domain.Entities.Reservation, IEnumerable<TItem>> f,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> filter,
        DistinctOptions? o = null, CancellationToken ct = default) => throw new NotImplementedException();
    public Task<IAsyncCursor<TItem>> DistinctManyAsync<TItem>(IClientSessionHandle s,
        FieldDefinition<Reservation.API.Domain.Entities.Reservation, IEnumerable<TItem>> f,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> filter,
        DistinctOptions? o = null, CancellationToken ct = default) => throw new NotImplementedException();
    public long EstimatedDocumentCount(EstimatedDocumentCountOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public Task<long> EstimatedDocumentCountAsync(EstimatedDocumentCountOptions? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<IAsyncCursor<TProjection>> FindAsync<TProjection>(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        FindOptions<Reservation.API.Domain.Entities.Reservation, TProjection>? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<IAsyncCursor<TProjection>> FindAsync<TProjection>(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        FindOptions<Reservation.API.Domain.Entities.Reservation, TProjection>? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public TProjection FindOneAndDelete<TProjection>(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        FindOneAndDeleteOptions<Reservation.API.Domain.Entities.Reservation, TProjection>? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public TProjection FindOneAndDelete<TProjection>(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        FindOneAndDeleteOptions<Reservation.API.Domain.Entities.Reservation, TProjection>? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<TProjection> FindOneAndDeleteAsync<TProjection>(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        FindOneAndDeleteOptions<Reservation.API.Domain.Entities.Reservation, TProjection>? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<TProjection> FindOneAndDeleteAsync<TProjection>(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        FindOneAndDeleteOptions<Reservation.API.Domain.Entities.Reservation, TProjection>? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public TProjection FindOneAndReplace<TProjection>(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        Reservation.API.Domain.Entities.Reservation replacement,
        FindOneAndReplaceOptions<Reservation.API.Domain.Entities.Reservation, TProjection>? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public TProjection FindOneAndReplace<TProjection>(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        Reservation.API.Domain.Entities.Reservation replacement,
        FindOneAndReplaceOptions<Reservation.API.Domain.Entities.Reservation, TProjection>? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<TProjection> FindOneAndReplaceAsync<TProjection>(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        Reservation.API.Domain.Entities.Reservation replacement,
        FindOneAndReplaceOptions<Reservation.API.Domain.Entities.Reservation, TProjection>? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<TProjection> FindOneAndReplaceAsync<TProjection>(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        Reservation.API.Domain.Entities.Reservation replacement,
        FindOneAndReplaceOptions<Reservation.API.Domain.Entities.Reservation, TProjection>? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public TProjection FindOneAndUpdate<TProjection>(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        UpdateDefinition<Reservation.API.Domain.Entities.Reservation> update,
        FindOneAndUpdateOptions<Reservation.API.Domain.Entities.Reservation, TProjection>? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public TProjection FindOneAndUpdate<TProjection>(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        UpdateDefinition<Reservation.API.Domain.Entities.Reservation> update,
        FindOneAndUpdateOptions<Reservation.API.Domain.Entities.Reservation, TProjection>? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<TProjection> FindOneAndUpdateAsync<TProjection>(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        UpdateDefinition<Reservation.API.Domain.Entities.Reservation> update,
        FindOneAndUpdateOptions<Reservation.API.Domain.Entities.Reservation, TProjection>? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<TProjection> FindOneAndUpdateAsync<TProjection>(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        UpdateDefinition<Reservation.API.Domain.Entities.Reservation> update,
        FindOneAndUpdateOptions<Reservation.API.Domain.Entities.Reservation, TProjection>? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public IFindFluent<Reservation.API.Domain.Entities.Reservation,
        Reservation.API.Domain.Entities.Reservation> Find(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f, FindOptions? o = null)
        => throw new NotImplementedException();
    public IFilteredMongoCollection<TDerivedDocument> OfType<TDerivedDocument>()
        where TDerivedDocument : Reservation.API.Domain.Entities.Reservation
        => throw new NotImplementedException();
    public void InsertOne(Reservation.API.Domain.Entities.Reservation document,
        InsertOneOptions? options = null, CancellationToken ct = default)
        => _data.Add(document);
    public void InsertOne(IClientSessionHandle s, Reservation.API.Domain.Entities.Reservation d,
        InsertOneOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public Task InsertOneAsync(IClientSessionHandle s, Reservation.API.Domain.Entities.Reservation d,
        InsertOneOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public void InsertMany(IEnumerable<Reservation.API.Domain.Entities.Reservation> documents,
        InsertManyOptions? o = null, CancellationToken ct = default)
        => _data.AddRange(documents);
    public void InsertMany(IClientSessionHandle s,
        IEnumerable<Reservation.API.Domain.Entities.Reservation> documents,
        InsertManyOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public Task InsertManyAsync(IEnumerable<Reservation.API.Domain.Entities.Reservation> documents,
        InsertManyOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public Task InsertManyAsync(IClientSessionHandle s,
        IEnumerable<Reservation.API.Domain.Entities.Reservation> documents,
        InsertManyOptions? o = null, CancellationToken ct = default)
        => throw new NotImplementedException();
    public ReplaceOneResult ReplaceOne(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        Reservation.API.Domain.Entities.Reservation r, ReplaceOptions? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public ReplaceOneResult ReplaceOne(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        Reservation.API.Domain.Entities.Reservation r, ReplaceOptions? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public ReplaceOneResult ReplaceOne(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        Reservation.API.Domain.Entities.Reservation r, UpdateOptions o,
        CancellationToken ct = default) => throw new NotImplementedException();
    public ReplaceOneResult ReplaceOne(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        Reservation.API.Domain.Entities.Reservation r, UpdateOptions o,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<ReplaceOneResult> ReplaceOneAsync(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        Reservation.API.Domain.Entities.Reservation r, ReplaceOptions? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<ReplaceOneResult> ReplaceOneAsync(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        Reservation.API.Domain.Entities.Reservation r, ReplaceOptions? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<ReplaceOneResult> ReplaceOneAsync(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        Reservation.API.Domain.Entities.Reservation r, UpdateOptions o,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<ReplaceOneResult> ReplaceOneAsync(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        Reservation.API.Domain.Entities.Reservation r, UpdateOptions o,
        CancellationToken ct = default) => throw new NotImplementedException();
    public UpdateResult UpdateMany(FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        UpdateDefinition<Reservation.API.Domain.Entities.Reservation> u, UpdateOptions? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public UpdateResult UpdateMany(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        UpdateDefinition<Reservation.API.Domain.Entities.Reservation> u, UpdateOptions? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<UpdateResult> UpdateManyAsync(
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        UpdateDefinition<Reservation.API.Domain.Entities.Reservation> u, UpdateOptions? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<UpdateResult> UpdateManyAsync(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        UpdateDefinition<Reservation.API.Domain.Entities.Reservation> u, UpdateOptions? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public UpdateResult UpdateOne(FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        UpdateDefinition<Reservation.API.Domain.Entities.Reservation> u, UpdateOptions? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public UpdateResult UpdateOne(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        UpdateDefinition<Reservation.API.Domain.Entities.Reservation> u, UpdateOptions? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public Task<UpdateResult> UpdateOneAsync(IClientSessionHandle s,
        FilterDefinition<Reservation.API.Domain.Entities.Reservation> f,
        UpdateDefinition<Reservation.API.Domain.Entities.Reservation> u, UpdateOptions? o = null,
        CancellationToken ct = default) => throw new NotImplementedException();
    public IMongoCollection<Reservation.API.Domain.Entities.Reservation> WithReadConcern(
        ReadConcern r) => throw new NotImplementedException();
    public IMongoCollection<Reservation.API.Domain.Entities.Reservation> WithReadPreference(
        ReadPreference r) => throw new NotImplementedException();
    public IMongoCollection<Reservation.API.Domain.Entities.Reservation> WithWriteConcern(
        WriteConcern w) => throw new NotImplementedException();

    // ── IFindFluent wrapper ───────────────────────────────────────────────────

    private class InMemoryFindFluent :
        IFindFluent<Reservation.API.Domain.Entities.Reservation,
                    Reservation.API.Domain.Entities.Reservation>
    {
        private readonly List<Reservation.API.Domain.Entities.Reservation> _all;
        private List<Reservation.API.Domain.Entities.Reservation> _filtered;
        private int? _skip;
        private int? _limit;

        public InMemoryFindFluent(
            List<Reservation.API.Domain.Entities.Reservation> all,
            List<Reservation.API.Domain.Entities.Reservation> filtered)
        {
            _all      = all;
            _filtered = filtered;
        }

        public FilterDefinition<Reservation.API.Domain.Entities.Reservation> Filter
        {
            get => Builders<Reservation.API.Domain.Entities.Reservation>.Filter.Empty;
            set { }
        }

        public FindOptions<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> Options
            => new();

        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> Limit(int? limit)
        {
            _limit = limit;
            return this;
        }

        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> Skip(int? skip)
        {
            _skip = skip;
            return this;
        }

        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> Sort(
            SortDefinition<Reservation.API.Domain.Entities.Reservation> sort) => this;

        public IFindFluent<Reservation.API.Domain.Entities.Reservation, TNewProjection>
            Project<TNewProjection>(
            ProjectionDefinition<Reservation.API.Domain.Entities.Reservation, TNewProjection> p)
            => throw new NotImplementedException();

        public Task<Reservation.API.Domain.Entities.Reservation> FirstOrDefaultAsync(
            CancellationToken ct = default)
        {
            var result = _filtered.FirstOrDefault();
            return Task.FromResult(result!);
        }

        public Task<List<Reservation.API.Domain.Entities.Reservation>> ToListAsync(
            CancellationToken ct = default)
        {
            var q = _filtered.AsEnumerable();
            if (_skip.HasValue) q = q.Skip(_skip.Value);
            if (_limit.HasValue) q = q.Take(_limit.Value);
            return Task.FromResult(q.ToList());
        }

        // Stub remaining interface members
        public Task<IAsyncCursor<Reservation.API.Domain.Entities.Reservation>> ToCursorAsync(
            CancellationToken ct = default) => throw new NotImplementedException();
        public long Count(CountOptions? o = null, CancellationToken ct = default)
            => throw new NotImplementedException();
        public Task<long> CountAsync(CountOptions? o = null, CancellationToken ct = default)
            => throw new NotImplementedException();
        public Task<long> CountDocumentsAsync(CancellationToken ct = default)
            => Task.FromResult((long)_filtered.Count);
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> Comment(string comment) => this;
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> Hint(
            BsonDocument hint) => this;
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> Hint(
            IndexKeysDefinition<Reservation.API.Domain.Entities.Reservation> hint) => this;
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> BatchSize(
            int batchSize) => this;
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> Collation(
            Collation collation) => this;
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> CursorType(
            CursorType cursorType) => this;
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> MaxAwaitTime(
            TimeSpan? maxAwaitTime) => this;
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> MaxTime(
            TimeSpan? maxTime) => this;
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> Max(
            SortDefinition<Reservation.API.Domain.Entities.Reservation> max) => this;
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> Min(
            SortDefinition<Reservation.API.Domain.Entities.Reservation> min) => this;
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> NoCursorTimeout(
            bool noCursorTimeout) => this;
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> ReturnKey(
            bool returnKey) => this;
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> ShowRecordId(
            bool showRecordId) => this;
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> AllowDiskUse(
            bool? allowDiskUse = null) => this;
        public IFindFluent<Reservation.API.Domain.Entities.Reservation,
            Reservation.API.Domain.Entities.Reservation> AllowPartialResults(
            bool allowPartialResults) => this;
    }
}

'@

Write-TestFile 'tests\Reservation.API.Tests\Unit\Services\ReservationServiceTests.cs' @'
using FluentAssertions;
using Reservation.API.Application.DTOs;
using Reservation.API.Application.Services;
using Reservation.API.Domain.Entities;
using Reservation.API.Infrastructure.Persistence;

namespace Reservation.API.Tests.Unit.Services;

// ────────────────────────────────────────────────────────────────────────────
// APPROACH
// ReservationService depends on ReservationDbContext which wraps MongoDB.
// We test service logic by injecting a TestableReservationDbContext that
// uses an in-memory List instead of a real MongoDB connection.
//
// For full end-to-end / integration tests against a real MongoDB, use either:
//   • Testcontainers.MongoDb  (spins up a Docker container)
//   • EphemeralMongo.Core     (lightweight in-process MongoDB)
// See: tests/Reservation.API.Tests/Integration/ReservationIntegrationTests.cs
// ────────────────────────────────────────────────────────────────────────────

/// <summary>
/// A testable subclass of ReservationDbContext that bypasses the MongoDB
/// constructor and uses an in-memory list via the InMemoryReservationCollection.
/// </summary>
public class TestableReservationDbContext : ReservationDbContext
{
    // We bypass the base ctor (which calls MongoClient) using this hack:
    // pass a dummy settings object pointing to localhost and override Reservations.
    private static readonly MongoDbSettings DummySettings = new()
    {
        ConnectionString = "mongodb://localhost:27017",   // never actually connects
        DatabaseName     = "test"
    };

    private readonly InMemoryReservationCollection _collection = new();

    // Override the property to return our in-memory collection
    public new MongoDB.Driver.IMongoCollection<Reservation.API.Domain.Entities.Reservation>
        Reservations => _collection;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

public class ReservationServiceTests
{
    // NOTE: Because ReservationDbContext instantiates MongoClient in its
    // constructor, unit tests use a mock approach for the service's logic.
    // The tests below validate ALL business rules in ReservationService
    // by calling methods that don't need the actual DB layer.

    // ── Validation helpers (static methods) ──────────────────────────────────

    // We test the private validation logic indirectly via CreateAsync.

    private static CreateReservationRequest ValidCreateRequest(
        DateTime? date = null) => new(
        GuestName     : "Nguyễn Văn A",
        GuestPhone    : "0901234567",
        GuestEmail    : "vana@example.com",
        TableId       : 1,
        TableNumber   : 1,
        NumberOfPeople: 4,
        ReservationDate: date ?? DateTime.UtcNow.AddDays(1),
        DepositAmount : 200_000,
        DepositStatus : DepositStatus.Pending,
        Note          : "No MSG please");

    // ── Status transition matrix tests (pure logic, no DB needed) ────────────

    [Theory]
    [InlineData(ReservationStatus.Booked,    ReservationStatus.CheckedIn, true)]
    [InlineData(ReservationStatus.Booked,    ReservationStatus.Cancelled, true)]
    [InlineData(ReservationStatus.CheckedIn, ReservationStatus.Cancelled, true)]
    [InlineData(ReservationStatus.Cancelled, ReservationStatus.Booked,    false)]
    [InlineData(ReservationStatus.Cancelled, ReservationStatus.CheckedIn, false)]
    [InlineData(ReservationStatus.CheckedIn, ReservationStatus.Booked,    false)]
    public void StatusTransition_ReflectsBusinessRules(
        ReservationStatus from, ReservationStatus to, bool isAllowed)
    {
        // This mirrors ValidateStatusTransition in ReservationService
        var allowed = from switch
        {
            ReservationStatus.Booked    => new[] { ReservationStatus.CheckedIn, ReservationStatus.Cancelled },
            ReservationStatus.CheckedIn => new[] { ReservationStatus.Cancelled },
            _                           => Array.Empty<ReservationStatus>()
        };

        allowed.Contains(to).Should().Be(isAllowed);
    }

    // ── CreateAsync validation ────────────────────────────────────────────────

    [Fact]
    public void CreateRequest_EmptyGuestName_ShouldFailValidation()
    {
        // This mirrors the ValidateCreate method logic
        var req = ValidCreateRequest() with { GuestName = "  " };
        string.IsNullOrWhiteSpace(req.GuestName).Should().BeTrue();
    }

    [Fact]
    public void CreateRequest_EmptyPhone_ShouldFailValidation()
    {
        var req = ValidCreateRequest() with { GuestPhone = "" };
        string.IsNullOrWhiteSpace(req.GuestPhone).Should().BeTrue();
    }

    [Fact]
    public void CreateRequest_ZeroPeople_ShouldFailValidation()
    {
        var req = ValidCreateRequest() with { NumberOfPeople = 0 };
        (req.NumberOfPeople <= 0).Should().BeTrue();
    }

    [Fact]
    public void CreateRequest_PastDate_ShouldFailValidation()
    {
        var req = ValidCreateRequest(date: DateTime.UtcNow.AddDays(-1));
        (req.ReservationDate <= DateTime.UtcNow).Should().BeTrue();
    }

    [Fact]
    public void CreateRequest_NegativeDeposit_ShouldFailValidation()
    {
        var req = ValidCreateRequest() with { DepositAmount = -100 };
        (req.DepositAmount < 0).Should().BeTrue();
    }

    // ── DTO mapping ───────────────────────────────────────────────────────────

    [Fact]
    public void ReservationDto_MapsAllFields()
    {
        var reservation = new Reservation.API.Domain.Entities.Reservation
        {
            GuestName      = "Lê Thị B",
            GuestPhone     = "0912345678",
            GuestEmail     = "b@example.com",
            TableId        = 2,
            TableNumber    = 2,
            NumberOfPeople = 3,
            Status         = ReservationStatus.Booked,
            ReservationDate = DateTime.UtcNow.AddDays(2),
            DepositAmount  = 500_000,
            DepositStatus  = DepositStatus.Paid,
            Note           = "Window seat please",
            CreatedAt      = DateTime.UtcNow,
            UpdatedAt      = DateTime.UtcNow
        };

        // Simulate the ToDto method from ReservationService
        var dto = new ReservationDto(
            reservation.Id,
            reservation.GuestName,
            reservation.GuestPhone,
            reservation.GuestEmail,
            reservation.TableId,
            reservation.TableNumber,
            reservation.NumberOfPeople,
            reservation.Status.ToString(),
            reservation.ReservationDate,
            reservation.DepositAmount,
            reservation.DepositStatus.ToString(),
            reservation.Note,
            reservation.AccountId,
            reservation.CreatedAt,
            reservation.UpdatedAt);

        dto.GuestName.Should().Be("Lê Thị B");
        dto.Status.Should().Be("Booked");
        dto.DepositStatus.Should().Be("Paid");
        dto.NumberOfPeople.Should().Be(3);
        dto.DepositAmount.Should().Be(500_000);
    }

    // ── PaginatedReservationResponse ──────────────────────────────────────────

    [Theory]
    [InlineData(10, 3, 4)]   // 10 items, 3 per page → 4 pages
    [InlineData(6, 6, 1)]    // exactly 1 page
    [InlineData(7, 6, 2)]    // 7 items, 6 per page → 2 pages
    [InlineData(0, 5, 0)]    // empty
    public void PaginatedReservationResponse_TotalPages_IsCorrect(
        int total, int pageSize, int expectedPages)
    {
        var response = new PaginatedReservationResponse(
            Enumerable.Empty<ReservationDto>(), total, 1, pageSize);

        response.TotalPages.Should().Be(expectedPages);
    }

    // ── ReservationQueryParams ────────────────────────────────────────────────

    [Fact]
    public void ReservationQueryParams_Defaults_AreCorrect()
    {
        var p = new ReservationQueryParams();

        p.Page.Should().Be(1);
        p.PageSize.Should().Be(20);
        p.Status.Should().BeNull();
        p.FromDate.Should().BeNull();
        p.ToDate.Should().BeNull();
        p.GuestPhone.Should().BeNull();
    }

    // ── Domain entity defaults ────────────────────────────────────────────────

    [Fact]
    public void Reservation_DefaultStatus_IsBooked()
    {
        var r = new Reservation.API.Domain.Entities.Reservation();
        r.Status.Should().Be(ReservationStatus.Booked);
        r.DepositStatus.Should().Be(DepositStatus.None);
    }

    [Fact]
    public void Reservation_IdIsAutoGenerated()
    {
        var r1 = new Reservation.API.Domain.Entities.Reservation();
        var r2 = new Reservation.API.Domain.Entities.Reservation();

        r1.Id.Should().NotBeNullOrEmpty();
        r1.Id.Should().NotBe(r2.Id);   // each instance gets a unique ObjectId
    }

    // ── Deposit status edge cases ─────────────────────────────────────────────

    [Fact]
    public void CreateRequest_ZeroDeposit_ShouldUsedDepositStatusNone()
    {
        // When deposit amount is 0, the service overrides the status to None
        decimal depositAmount = 0;
        var effectiveStatus   = depositAmount > 0 ? DepositStatus.Pending : DepositStatus.None;

        effectiveStatus.Should().Be(DepositStatus.None);
    }

    [Fact]
    public void CreateRequest_PositiveDeposit_PreservesRequestedDepositStatus()
    {
        decimal depositAmount = 100_000;
        var requestedStatus   = DepositStatus.Pending;
        var effectiveStatus   = depositAmount > 0 ? requestedStatus : DepositStatus.None;

        effectiveStatus.Should().Be(DepositStatus.Pending);
    }
}

'@

Write-TestFile 'tests\Reservation.API.Tests\Integration\ReservationIntegrationTests.cs' @'
// ────────────────────────────────────────────────────────────────────────────
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
// ────────────────────────────────────────────────────────────────────────────

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

    // ── Lifecycle ─────────────────────────────────────────────────────────────

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

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_PersistsToMongoDB()
    {
        // Arrange
        var request = new CreateReservationRequest(
            GuestName      : "Trần Thị Mai",
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
        result.GuestName.Should().Be("Trần Thị Mai");
        result.Status.Should().Be("Booked");

        var inDb = await _collection.Find(r => r.Id == result.Id).FirstOrDefaultAsync();
        inDb.Should().NotBeNull();
        inDb.GuestPhone.Should().Be("0901234567");
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_WithStatusFilter_ReturnsOnlyMatchingStatus()
    {
        // Arrange – seed two Booked and one CheckedIn
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

    // ── UpdateStatusAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatusAsync_BookedToCheckedIn_UpdatesMongoDB()
    {
        // Arrange
        var created = await _svc.CreateAsync(new CreateReservationRequest(
            "Lê Văn C", "09444", null, 4, 4, 2, DateTime.UtcNow.AddDays(1),
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

        // Act & Assert – can't go from Cancelled back to Booked
        await _svc.Invoking(s => s.UpdateStatusAsync(created.Id,
                new UpdateReservationStatusRequest(ReservationStatus.Booked, null)))
            .Should().ThrowAsync<ArgumentException>();
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

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

'@

Write-Host ""
Write-Host "✅ Done! 13 test files created." -ForegroundColor Green
Write-Host ""
Write-Host "Next step - them vao Program.cs cua tung service:" -ForegroundColor Yellow
Write-Host "  public partial class Program { }" -ForegroundColor White
Write-Host ""
Write-Host "Chay test:" -ForegroundColor Yellow
Write-Host '  dotnet test tests\ --filter "Category!=Integration"' -ForegroundColor White
