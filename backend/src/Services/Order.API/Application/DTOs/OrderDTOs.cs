using Order.API.Domain.Entities;

namespace Order.API.Application.DTOs;

// ─── Table ────────────────────────────────────────────
public record TableDto(
    int Id,
    int Number,
    int Capacity,
    string Status,
    bool IsVisibleOnReservation,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CreateTableRequest(
    int Number,
    int Capacity);

public record UpdateTableStatusRequest(TableStatus Status);

public record UpdateTableVisibilityRequest(bool IsVisibleOnReservation);  // ← NEW

// ─── Guest ────────────────────────────────────────────
public record GuestLoginRequest(
    int TableNumber,
    string Name);

public record GuestLoginResponse(
    GuestDto Guest,
    string AccessToken,
    string RefreshToken);

public record GuestDto(
    int Id,
    string Name,
    int TableId,
    int TableNumber,
    DateTime CreatedAt);

public record GuestRefreshTokenRequest(string RefreshToken);

// ─── Order ────────────────────────────────────────────
public record OrderDto(
    int Id,
    int GuestId,
    string GuestName,
    int TableId,
    int TableNumber,
    int DishSnapshotId,
    string DishName,
    decimal DishPrice,
    string? DishImage,
    int? AccountId,
    int Quantity,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CreateOrderRequest(
    int? TableId,
    int DishSnapshotId,
    int Quantity);

public record UpdateOrderStatusRequest(
    OrderStatus Status,
    int? AccountId);

public record ReservationTableDto(int Id, int Number, int Capacity, string Status);