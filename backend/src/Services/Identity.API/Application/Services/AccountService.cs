// Application/Services/AccountService.cs
using Identity.API.Application.DTOs;
using Identity.API.Application.Interfaces;
using Identity.API.Application.Mappers;
using Identity.API.Domain.Entities;
using Identity.API.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Shared.DTOs;

namespace Identity.API.Application.Services;

public class AccountService
{
    private readonly IdentityDbContext _db;
    private readonly IPasswordUtil _passwordService;

    public AccountService(IdentityDbContext db, IPasswordUtil passwordService)
    {
        _db = db;
        _passwordService = passwordService;
    }

    // ─── Query ────────────────────────────────────────

    public async Task<PaginatedResponse<AccountDto>> GetAllAsync(PaginationParams p)
    {
        var query = _db.Accounts.OrderByDescending(a => a.CreatedAt);
        var total = await query.CountAsync();
        var items = await query
            .Skip(p.Skip)
            .Take(p.Take)
            .ToListAsync();
        return new PaginatedResponse<AccountDto>(items.Select(AccountMapper.ToDto), total, p.Page, p.Take);
    }

    public async Task<AccountDto?> GetByIdAsync(int id)
    {
        var account = await _db.Accounts.FindAsync(id);
        return account is null ? null : AccountMapper.ToDto(account);
    }

    public async Task<AccountDto> GetProfileAsync(int accountId)
    {
        var account = await _db.Accounts.FindAsync(accountId);

        if (account is null)
        {
            throw new KeyNotFoundException("Account isn't exists");
        }
        return AccountMapper.ToDto(account);
    }

    // ─── Profile (self) ───────────────────────────────

    public async Task<AccountDto> UpdateProfileAsync(int accountId, UpdateProfileRequest request)
    {
        var account = await _db.Accounts.FindAsync(accountId);
        if (account is null)
        {
            throw new KeyNotFoundException("Account isn't exists");
        }

        account.Name = request.Name.Trim();
        account.Avatar = request.Avatar;
        account.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return AccountMapper.ToDto(account);
    }

    public async Task ChangePasswordAsync(int accountId, ChangePasswordRequest request)
    {
        if (request.NewPassword != request.ConfirmPassword)
            throw new ArgumentException("Password");

        var account = await _db.Accounts.FindAsync(accountId)
            ?? throw new KeyNotFoundException("Account not found");

        if (!_passwordService.Verify(request.OldPassword, account.Password))
            throw new UnauthorizedAccessException("Old password is incorrect");

        account.Password = _passwordService.Hash(request.NewPassword);
        account.UpdatedAt = DateTime.UtcNow;

        var tokens = await _db.RefreshTokens
            .Where(rt => rt.AccountId == accountId)
            .ToListAsync();
        _db.RefreshTokens.RemoveRange(tokens);

        await _db.SaveChangesAsync();
    }

    // ─── SuperAdmin tạo Admin ─────────────────────────

    public Task<AccountDto> CreateAdminAsync(CreateAdminRequest request) =>
    CreateAccountAsync(
        request.Name,
        request.Email,
        request.Password,
        request.ConfirmPassword,
        UserRole.Admin);

    // ─── Admin tạo Staff ──────────────────────────────
    public Task<AccountDto> CreateStaffAsync(CreateStaffRequest request) =>
        CreateAccountAsync(
            request.Name,
            request.Email,
            request.Password,
            request.ConfirmPassword,
            UserRole.Staff);

    // ─── Update / Delete ──────────────────────────────

    public async Task<AccountDto> UpdateEmployeeAsync(int id, UpdateEmployeeRequest request)
    {
        var account = await _db.Accounts.FindAsync(id)
            ?? throw new KeyNotFoundException("Account not found");

        account.Name = request.Name.Trim();
        account.Email = request.Email.ToLower().Trim();
        account.Avatar = request.Avatar;
        account.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return AccountMapper.ToDto(account);
    }

    public async Task<AccountDto> DeleteAsync(int id)
    {
        var account = await _db.Accounts.FindAsync(id)
            ?? throw new KeyNotFoundException("Account not found");

        _db.Accounts.Remove(account);
        await _db.SaveChangesAsync();
        return AccountMapper.ToDto(account);
    }


    private async Task<AccountDto> CreateAccountAsync(
    string name,
    string email,
    string password,
    string confirmPassword,
    UserRole role)
    {
        if (password != confirmPassword)
            throw new ArgumentException("Password confirmation does not match");

        var normalizedEmail = email.ToLower().Trim();

        if (await _db.Accounts.AnyAsync(a => a.Email == normalizedEmail))
            throw new ArgumentException("Email already exists");

        var account = new Account
        {
            Name = name.Trim(),
            Email = normalizedEmail,
            Password = _passwordService.Hash(password),
            Role = role,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Accounts.Add(account);
        await _db.SaveChangesAsync();

        return AccountMapper.ToDto(account);
    }
}