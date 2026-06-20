using Order.API.Domain.Entities;
using System.Security.Claims;

namespace Order.API.Application.Interfaces;

public interface IGuestJwtUtil
{
    string GenerateAccessToken(Guest guest, Guid sessionId);
    string GenerateRefreshToken(Guest guest, Guid sessionId);
    ClaimsPrincipal ValidateToken(string token, bool isRefreshToken);
}