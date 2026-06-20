using System.Security.Claims;
using Identity.API.Domain.Entities;

namespace Identity.API.Application.Interfaces;

public interface IJwtUtil
{
    string GenerateAccessToken(Account account);
    string GenerateRefreshToken(Account account);
    ClaimsPrincipal ValidateRefreshToken(string token);
}

public interface IPasswordUtil
{
    string Hash(string password);
    bool Verify(string password, string hash);
}