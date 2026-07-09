using Microsoft.IdentityModel.Tokens;
using Order.API.Application.Interfaces;
using Order.API.Domain.Entities;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Order.API.Infrastructure.Utils;

public class GuestJwtSettings
{
    public string AccessTokenSecret { get; set; } = null!;
    public string RefreshTokenSecret { get; set; } = null!;
    public string Issuer { get; set; } = "RestaurantQR";
    public string Audience { get; set; } = "RestaurantQR";
    public int AccessTokenExpiresInMinutes { get; set; } = 60;
    public int RefreshTokenExpiresInDays { get; set; } = 1;
}

public class GuestJwtUtil : IGuestJwtUtil
{
    private readonly GuestJwtSettings _settings;

    public GuestJwtUtil(GuestJwtSettings settings)
    {
        _settings = settings;
    }

    public string GenerateAccessToken(Guest guest, Guid sessionId)
    {
        var claims = new[]
        {
            new Claim("guestId", guest.Id.ToString()),
             new Claim("tableId", guest.TableNumber.ToString()),  // ← đổi từ TableId → TableNumber
            new Claim("sessionId", sessionId.ToString()), // snapshot SessionId
            new Claim("role", "Guest"),
            new Claim("tokenType", "GuestAccess"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        return GenerateToken(claims, _settings.AccessTokenSecret,
            TimeSpan.FromMinutes(_settings.AccessTokenExpiresInMinutes));
    }

    public string GenerateRefreshToken(Guest guest, Guid sessionId)
    {
        var claims = new[]
        {
            new Claim("guestId", guest.Id.ToString()),
             new Claim("tableId", guest.TableNumber.ToString()),  // ← đổi từ TableId → TableNumber
            new Claim("sessionId", sessionId.ToString()),
            new Claim("tokenType", "GuestRefresh"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        return GenerateToken(claims, _settings.RefreshTokenSecret,
            TimeSpan.FromDays(_settings.RefreshTokenExpiresInDays));
    }

    public ClaimsPrincipal ValidateToken(string token, bool isRefreshToken)
    {
        var secret = isRefreshToken
            ? _settings.RefreshTokenSecret
            : _settings.AccessTokenSecret;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));

        return new JwtSecurityTokenHandler().ValidateToken(token,
            new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = true,
                ValidIssuer = _settings.Issuer,
                ValidateAudience = true,
                ValidAudience = _settings.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out _);
    }

    private string GenerateToken(Claim[] claims, string secret, TimeSpan expiresIn)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.Add(expiresIn),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}