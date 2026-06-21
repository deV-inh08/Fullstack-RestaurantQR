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

    // â”€â”€ GenerateAccessToken â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€ GenerateRefreshToken â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public void GenerateRefreshToken_ContainsRefreshTokenType()
    {
        var util  = CreateUtil();
        var token = util.GenerateRefreshToken(TestAccount());
        var jwt   = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.Should().Contain(c => c.Type == "tokenType" && c.Value == "RefreshToken");
        jwt.Claims.Should().Contain(c => c.Type == "userId"    && c.Value == "42");
    }

    // â”€â”€ ValidateRefreshToken â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        // ValidateRefreshToken uses RefreshTokenSecret â†’ signature mismatch.
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
