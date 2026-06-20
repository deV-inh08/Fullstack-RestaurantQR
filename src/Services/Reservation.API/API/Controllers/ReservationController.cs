using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Reservation.API.Application.DTOs;
using Reservation.API.Application.Services;

namespace Reservation.API.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class ReservationController : ControllerBase
{
    private readonly ReservationService _reservationService;

    public ReservationController(ReservationService reservationService)
    {
        _reservationService = reservationService;
    }

    // ─── Staff / Admin / SuperAdmin ───────────────────

    [HttpGet]
    [Authorize(Roles = "SuperAdmin,Admin,Staff")]
    public async Task<IActionResult> GetAll([FromQuery] ReservationQueryParams p)
    {
        var result = await _reservationService.GetAllAsync(p);
        return Ok(new { message = "Get all reservations successfully", data = result });
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin,Staff")]
    public async Task<IActionResult> GetById(string id)
    {
        var result = await _reservationService.GetByIdAsync(id);
        return Ok(new { message = "Get reservation successfully", data = result });
    }

    // ─── Public — Guest tự đặt bàn ───────────────────

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Create([FromBody] CreateReservationRequest request)
    {
        var result = await _reservationService.CreateAsync(request);
        return Ok(new { message = "Reservation created successfully", data = result });
    }

    // ─── Admin / Staff — cập nhật thông tin ──────────

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin,Staff")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateReservationRequest request)
    {
        var result = await _reservationService.UpdateAsync(id, request);
        return Ok(new { message = "Reservation updated successfully", data = result });
    }

    /// <summary>
    /// Cập nhật trạng thái đặt bàn: Booked → CheckedIn / Cancelled
    /// </summary>
    [HttpPatch("{id}/status")]
    [Authorize(Roles = "SuperAdmin,Admin,Staff")]
    public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateReservationStatusRequest request)
    {
        var result = await _reservationService.UpdateStatusAsync(id, request);
        return Ok(new { message = "Status updated successfully", data = result });
    }

    /// <summary>
    /// Cập nhật trạng thái cọc: Pending → Paid / Refunded / Forfeited
    /// </summary>
    [HttpPatch("{id}/deposit")]
    [Authorize(Roles = "SuperAdmin,Admin,Staff")]
    public async Task<IActionResult> UpdateDeposit(string id, [FromBody] UpdateDepositStatusRequest request)
    {
        var result = await _reservationService.UpdateDepositStatusAsync(id, request);
        return Ok(new { message = "Deposit status updated successfully", data = result });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Delete(string id)
    {
        var result = await _reservationService.DeleteAsync(id);
        return Ok(new { message = "Reservation deleted successfully", data = result });
    }
}