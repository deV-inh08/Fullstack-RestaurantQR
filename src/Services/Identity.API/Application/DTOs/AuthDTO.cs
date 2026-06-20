namespace Identity.API.Application.DTOs;

// ─── Auth ─────────────────────────────────────
public record LoginRequest(
    string Email,
    string Password);

public record LoginResponse(
    AccountDto Account,
    string AccessToken,
    string RefreshToken);

public record RefreshTokenRequest(string RefreshToken);

public record RefreshTokenResponse(
    string AccessToken,
    string RefreshToken);

// ─── Account ──────────────────────────────────
public record AccountDto(
    int Id,
    string Name,
    string Email,
    string Role,
    string? Avatar,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record UpdateProfileRequest(
    string Name,
    string? Avatar);

public record ChangePasswordRequest(
    string OldPassword,
    string NewPassword,
    string ConfirmPassword);

// ─── SuperAdmin tạo Admin ─────────────────────
public record CreateAdminRequest(
    string Name,
    string Email,
    string Password,
    string ConfirmPassword);

// ─── Admin tạo Staff ──────────────────────────
public record CreateStaffRequest(
    string Name,
    string Email,
    string Password,
    string ConfirmPassword);

// ─── Cập nhật employee (Admin sửa Staff, SuperAdmin sửa Admin)
public record UpdateEmployeeRequest(
    string Name,
    string Email,
    string? Avatar);