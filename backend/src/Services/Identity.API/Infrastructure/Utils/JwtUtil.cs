using Identity.API.Application.Interfaces;
using Identity.API.Domain.Entities;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Identity.API.Infrastructure.Utils
{

    public class JwtSettings
    {
        public string AccessTokenSecret { get; set; } = null!;
        public string RefreshTokenSecret { get; set; } = null!;
        public string Issuer { get; set; } = "RestaurantQR";
        public string Audience { get; set; } = "RestaurantQR";
        public int AccessTokenExpiresInMinutes { get; set; } = 15;
        public int RefreshTokenExpiresInDays { get; set; } = 7;
    }

    public class JwtUtil : IJwtUtil
    {
        private readonly JwtSettings _settings;

        public JwtUtil(JwtSettings settings)
        {
            _settings = settings;
        }

        public string GenerateAccessToken(Account account)
        {
            // AT: header (algorithm) + payload (account (id, role, email)) + signature (derived from header + payload + secret)
            var claims = new[]
            {
                new Claim("userId", account.Id.ToString()),
                new Claim("role", account.Role.ToString()),
                new Claim("email", account.Email.ToString()),
                new Claim("tokenType", "AccessToken"),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };


            var AToken = GenerateToken(
                claims,
                _settings.AccessTokenSecret,
                TimeSpan.FromMinutes(_settings.AccessTokenExpiresInMinutes)
              );

            return AToken;
        }

        public string GenerateRefreshToken(Account account)
        {
            var claims = new[]
        {
            new Claim("userId", account.Id.ToString()),
            new Claim("tokenType", "RefreshToken"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

            var RToken = GenerateToken(
                claims,
                _settings.RefreshTokenSecret,
                TimeSpan.FromDays(_settings.RefreshTokenExpiresInDays)
            );
            return RToken;
        }

        public ClaimsPrincipal ValidateRefreshToken(string token)
        {
            // get secret key 
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.RefreshTokenSecret));
            // validate token
            var tokenHandler = new JwtSecurityTokenHandler();
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _settings.Issuer,
                ValidateAudience = true,
                ValidAudience = _settings.Audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            // out _: nếu token hợp lệ, sẽ trả về ClaimsPrincipal chứa thông tin từ token; nếu không hợp lệ, sẽ ném ra SecurityTokenException
            var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
            return principal;
        }


        private string GenerateToken(Claim[] claims, string secret, TimeSpan expiresIn)
        {
            // 1. Create signing key from secret
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));

            // 2. Create signing credentials using the key and a hashing algorithm
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

}
