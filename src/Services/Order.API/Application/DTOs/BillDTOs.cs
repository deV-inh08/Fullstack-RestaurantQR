using Order.API.Domain.Entities;

namespace Order.API.Application.DTOs;

// ─── Bill DTO ─────────────────────────────────────────────────────────────────

public record BillOrderItemDto(
    int DishSnapshotId,
    string DishName,
    string? DishImage,
    int Quantity,
    decimal UnitPrice,
    decimal Subtotal,
    string Status);

public record BillDto(
    int Id,
    int TableId,
    int TableNumber,
    string GuestName,
    string SessionId,
    IEnumerable<BillOrderItemDto> Orders,
    decimal TotalAmount,
    string Status,
    int? AccountId,
    DateTime CreatedAt,
    DateTime UpdatedAt);

// ─── Requests ─────────────────────────────────────────────────────────────────

/// <summary>Guest gọi khi bấm "Yêu cầu thanh toán" — không cần body,
/// thông tin lấy từ JWT (guestId, tableId, sessionId)</summary>
public record RequestBillRequest();

/// <summary>Staff gọi khi xác nhận đã thu tiền</summary>
public record ConfirmBillRequest(int AccountId);