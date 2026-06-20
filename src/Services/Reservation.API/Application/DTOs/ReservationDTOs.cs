using Reservation.API.Domain.Entities;

namespace Reservation.API.Application.DTOs;

// ─── Response ─────────────────────────────────────────
public record ReservationDto(
    string Id,
    string GuestName,
    string GuestPhone,
    string? GuestEmail,
    int? TableId,
    int? TableNumber,
    int NumberOfPeople,
    string Status,
    DateTime ReservationDate,
    decimal DepositAmount,
    string DepositStatus,
    string? Note,
    int? AccountId,
    DateTime CreatedAt,
    DateTime UpdatedAt);

// ─── Create ───────────────────────────────────────────
public record CreateReservationRequest(
    string GuestName,
    string GuestPhone,
    string? GuestEmail,
    int? TableId,
    int? TableNumber,
    int NumberOfPeople,
    DateTime ReservationDate,
    decimal DepositAmount,
    DepositStatus DepositStatus,
    string? Note);

// ─── Update ───────────────────────────────────────────
public record UpdateReservationRequest(
    string GuestName,
    string GuestPhone,
    string? GuestEmail,
    int? TableId,
    int NumberOfPeople,
    DateTime ReservationDate,
    decimal DepositAmount,
    string? Note);

// ─── Status update (Admin workflow) ───────────────────
public record UpdateReservationStatusRequest(
    ReservationStatus Status,
    int? AccountId);

// ─── Deposit update ───────────────────────────────────
public record UpdateDepositStatusRequest(
    DepositStatus DepositStatus);

// ─── Query params ─────────────────────────────────────
public record ReservationQueryParams(
    int Page = 1,
    int PageSize = 20,
    ReservationStatus? Status = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string? GuestPhone = null);