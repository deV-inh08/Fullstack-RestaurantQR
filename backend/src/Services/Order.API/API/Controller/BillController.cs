using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Order.API.Application.DTOs;
using Order.API.Application.Service;
using Shared.DTOs;

namespace Order.API.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class BillController : ControllerBase
{
    private readonly BillService _billService;

    public BillController(BillService billService) => _billService = billService;

    // ─── Staff / Admin ────────────────────────────────────────────────────────

    /// <summary>
    /// Lấy tất cả bills, phân trang, mới nhất trước.
    /// Dùng cho admin orders page để hiển thị danh sách yêu cầu thanh toán.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "SuperAdmin,Admin,Staff")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationParams p)
    {
        var result = await _billService.GetAllAsync(p);
        return Ok(new { message = "Get all bills successfully", data = result });
    }

    /// <summary>
    /// Lấy bill hiện tại của một bàn (theo session đang chạy).
    /// Nếu chưa có bill entity → trả về computed bill với status Unpaid.
    /// </summary>
    [HttpGet("table/{tableId:int}")]
    [Authorize(Roles = "SuperAdmin,Admin,Staff")]
    public async Task<IActionResult> GetByTable(int tableId)
    {
        var result = await _billService.GetByTableAsync(tableId);
        return Ok(new { message = "Get bill successfully", data = result });
    }

    /// <summary>
    /// Staff xác nhận đã thu tiền → Bill.Status = Paid.
    /// Triggers SignalR "BillPaid" → guest table group + staff group.
    /// </summary>
    [HttpPatch("{id:int}/pay")]
    [Authorize(Roles = "SuperAdmin,Admin,Staff")]
    public async Task<IActionResult> ConfirmPayment(int id, [FromBody] ConfirmBillRequest request)
    {
        var result = await _billService.ConfirmPaymentAsync(id, request.AccountId);
        return Ok(new { message = "Payment confirmed successfully", data = result });
    }

    // ─── Guest ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Guest bấm "Yêu cầu thanh toán".
    /// Không cần body — thông tin lấy từ JWT claims (guestId, sessionId).
    /// Triggers SignalR "BillRequested" → staff group.
    /// </summary>
    [HttpPost("request")]
    [Authorize(Roles = "Guest")]
    public async Task<IActionResult> RequestBill()
    {
        var (guestId, sessionId) = GetGuestClaims();
        var result = await _billService.RequestBillAsync(guestId, sessionId);
        return Ok(new { message = "Bill requested successfully", data = result });
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private (int guestId, Guid sessionId) GetGuestClaims()
    {
        var guestId = int.Parse(
            HttpContext.User.FindFirst("guestId")?.Value
            ?? throw new UnauthorizedAccessException("Token invalid"));

        var sessionId = Guid.Parse(
            HttpContext.User.FindFirst("sessionId")?.Value
            ?? throw new UnauthorizedAccessException("Token invalid"));

        return (guestId, sessionId);
    }
}