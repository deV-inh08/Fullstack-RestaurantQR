using Identity.API.Application.DTOs;
using Identity.API.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.DTOs;

namespace Identity.API.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class AccountController : ControllerBase
{
    private readonly AccountService _accountService;

    public AccountController(AccountService accountService)
    {
        _accountService = accountService;
    }

    // ─── Ai cũng dùng được (đã login) ────────────────

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = GetCurrentUserId();
        var result = await _accountService.GetProfileAsync(userId);
        return Ok(new { message = "Get profile successfully", data = result });
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _accountService.UpdateProfileAsync(userId, request);
        return Ok(new { message = "Update profile successfully", data = result });
    }

    [HttpPut("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = GetCurrentUserId();
        await _accountService.ChangePasswordAsync(userId, request);
        return Ok(new { message = "Change password successfully" });
    }

    // ─── Manage Acccounts ────────────────────

    [HttpGet]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationParams p)
    {
        var result = await _accountService.GetAllAsync(p);
        return Ok(new { message = "Get all accounts successfully", data = result });
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _accountService.GetByIdAsync(id);
        if (result is null)
            return NotFound(new { message = "Account not found" });
        return Ok(new { message = "Get account successfully", data = result });
    }

    [HttpPost("admin")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminRequest request)
    {
        var result = await _accountService.CreateAdminAsync(request);
        return Ok(new { message = "Create Admin account successfully", data = result });
    }

    // ─── Admin: quản lý Staff ─────────────────────────

    [HttpPost("staff")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> CreateStaff([FromBody] CreateStaffRequest request)
    {
        var result = await _accountService.CreateStaffAsync(request);
        return Ok(new { message = "Create Staff account successfully", data = result });
    }

    // ─── Update / Delete (higher level manages lower level) ─

    [HttpPut("{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateEmployee(int id, [FromBody] UpdateEmployeeRequest request)
    {
        var result = await _accountService.UpdateEmployeeAsync(id, request);
        return Ok(new { message = "Update employee account successfully", data = result });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _accountService.DeleteAsync(id);
        return Ok(new { message = "Delete account successfully", data = result });
    }

    private int GetCurrentUserId()
    {
        // Middleware decode JWT --> Assign User to HTTPContext
        var claim = HttpContext.User.FindFirst("userId")?.Value
            ?? throw new UnauthorizedAccessException("UserId not found in token");
        return int.Parse(claim);
    }
}