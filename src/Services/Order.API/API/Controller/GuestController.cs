using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Order.API.Application.DTOs;
using Order.API.Application.Service;

namespace Order.API.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class GuestController : ControllerBase
{
    private readonly GuestService _guestService;
    public GuestController(GuestService guestService) => _guestService = guestService;

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] GuestLoginRequest request)
    {
        var result = await _guestService.LoginAsync(request);
        return Ok(new { message = "Login Successfully", data = result });
    }

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public async Task<IActionResult> RefreshToken([FromBody] GuestRefreshTokenRequest request)
    {
        var result = await _guestService.RefreshTokenAsync(request);
        return Ok(new { message = "Token was renew", data = result });
    }
}