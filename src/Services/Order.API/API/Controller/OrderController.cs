using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Order.API.Application.DTOs;
using Order.API.Application.Service;
using Shared.DTOs;

namespace Order.API.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class OrderController : ControllerBase
{
    private readonly OrderService _orderService;
    public OrderController(OrderService orderService) => _orderService = orderService;

    [HttpGet]
    [Authorize(Roles = "SuperAdmin,Admin,Staff")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationParams p)
    {
        var result = await _orderService.GetAllAsync(p);
        return Ok(new { message = "Get all orders successfully", data = result });
    }

    [HttpGet("my-orders")]
    [Authorize(Roles = "Guest")]
    public async Task<IActionResult> GetMyOrders()
    {
        var (guestId, sessionId) = GetGuestClaims();
        var result = await _orderService.GetByGuestAsync(guestId);
        return Ok(new { message = "Get my orders successfully", data = result });
    }

    [HttpPost]
    [Authorize(Roles = "Guest,Staff,Admin,SuperAdmin")]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest request)
    {
        var role = HttpContext.User.FindFirst("role")?.Value
            ?? throw new UnauthorizedAccessException("Token invalid");
        if (role == "Guest")
        {
            var (guestId, sessionId) = GetGuestClaims();
            var result = await _orderService.CreateAsync(guestId, sessionId, request);
            return Ok(new { message = "Order successfully", data = result });

        }
        else
        {
            var result = await _orderService.CreateAsStaffAsync(request);
            return Ok(new { message = "Order successfully", data = result });
        }
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "SuperAdmin,Admin,Staff")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusRequest request)
    {
        var result = await _orderService.UpdateStatusAsync(id, request);
        return Ok(new { message = "Update status successfully", data = result });
    }

    private (int guestId, Guid sessionId) GetGuestClaims()
    {
        var guestId = int.Parse(HttpContext.User.FindFirst("guestId")?.Value
            ?? throw new UnauthorizedAccessException("Token invalid"));

        var sessionId = Guid.Parse(HttpContext.User.FindFirst("sessionId")?.Value
            ?? throw new UnauthorizedAccessException("Token invalid"));


        return (guestId, sessionId);
    }
}