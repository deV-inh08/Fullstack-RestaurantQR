// Application/Services/AuthService.cs
using Identity.API.Application.DTOs;
using Identity.API.Application.Interfaces;
using Identity.API.Domain.Entities;
using Identity.API.Infrastructure.Persistence;
using Identity.API.Infrastructure.Utils;
using Identity.API.Application.Mappers;
using Microsoft.EntityFrameworkCore;

namespace Identity.API.Application.Services;

public class AuthService
{
    private readonly IdentityDbContext _db;
    private readonly IJwtUtil _jwtUtil;
    private readonly IPasswordUtil _passwordUtil;

    public AuthService(
        IdentityDbContext db,
        IJwtUtil jwtUtil,
        IPasswordUtil passwordUtil)
    {
        _db = db;
        _jwtUtil = jwtUtil;
        _passwordUtil = passwordUtil;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var account = await _db.Accounts
            .FirstOrDefaultAsync(a => a.Email == request.Email.ToLower());

        Console.WriteLine($"Account {account.Email}");

        if (account is null)
            throw new UnauthorizedAccessException("Email isn't exists");

        if (!_passwordUtil.Verify(request.Password, account.Password))
            throw new UnauthorizedAccessException("Email or password incorrect");

        var accessToken = _jwtUtil.GenerateAccessToken(account);
        var refreshToken = _jwtUtil.GenerateRefreshToken(account);

        _db.RefreshTokens.Add(new RefreshToken
        {
            Token = refreshToken,
            AccountId = account.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        return new LoginResponse(
            Account: AccountMapper.ToDto(account),
            AccessToken: accessToken,
            RefreshToken: refreshToken);
    }

    public async Task<RefreshTokenResponse> RefreshTokenAsync(string refreshToken)
    {
        var storedToken = await _db.RefreshTokens
            .Include(rt => rt.Account)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

        if (storedToken is null || storedToken.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Refresh token invalid or expired");

        // hard delete token
        _db.RefreshTokens.Remove(storedToken);

        var newAccessToken = _jwtUtil.GenerateAccessToken(storedToken.Account);
        var newRefreshToken = _jwtUtil.GenerateRefreshToken(storedToken.Account);

        _db.RefreshTokens.Add(new RefreshToken
        {
            Token = newRefreshToken,
            AccountId = storedToken.AccountId,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return new RefreshTokenResponse(newAccessToken, newRefreshToken);
    }

    public async Task LogoutAsync(string refreshToken)
    {
        var storedToken = await _db.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

        if (storedToken is not null)
        {
            _db.RefreshTokens.Remove(storedToken);
            await _db.SaveChangesAsync();
        }
    }

    public static AccountDto ToDto(Account a) => new(
        a.Id, a.Name, a.Email, a.Role.ToString(),
        a.Avatar, a.CreatedAt, a.UpdatedAt);
}