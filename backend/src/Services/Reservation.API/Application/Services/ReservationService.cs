using MongoDB.Driver;
using Reservation.API.Application.DTOs;
using Reservation.API.Domain.Entities;
using Reservation.API.Infrastructure.Persistence;

namespace Reservation.API.Application.Services;

public class ReservationService
{
    private readonly ReservationDbContext _db;

    public ReservationService(ReservationDbContext db)
    {
        _db = db;
    }

    // ─── Query ────────────────────────────────────────

    public async Task<PaginatedReservationResponse> GetAllAsync(ReservationQueryParams p)
    {
        var builder = Builders<Domain.Entities.Reservation>.Filter;
        var filter = builder.Empty;

        if (p.Status.HasValue)
            filter &= builder.Eq(r => r.Status, p.Status.Value);

        if (p.FromDate.HasValue)
            filter &= builder.Gte(r => r.ReservationDate, p.FromDate.Value.ToUniversalTime());

        if (p.ToDate.HasValue)
            filter &= builder.Lte(r => r.ReservationDate, p.ToDate.Value.ToUniversalTime());

        if (!string.IsNullOrWhiteSpace(p.GuestPhone))
            filter &= builder.Regex(r => r.GuestPhone, new MongoDB.Bson.BsonRegularExpression(p.GuestPhone, "i"));

        var total = await _db.Reservations.CountDocumentsAsync(filter);

        var items = await _db.Reservations
            .Find(filter)
            .SortByDescending(r => r.CreatedAt)
            .Skip((p.Page - 1) * p.PageSize)
            .Limit(p.PageSize)
            .ToListAsync();

        return new PaginatedReservationResponse(
            items.Select(ToDto),
            (int)total,
            p.Page,
            p.PageSize);
    }

    public async Task<ReservationDto> GetByIdAsync(string id)
    {
        var reservation = await _db.Reservations
            .Find(r => r.Id == id)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"Reservation {id} not found");

        return ToDto(reservation);
    }

    // ─── Mutations ────────────────────────────────────

    public async Task<ReservationDto> CreateAsync(CreateReservationRequest request)
    {
        ValidateCreate(request);

        var reservation = new Domain.Entities.Reservation
        {
            GuestName = request.GuestName.Trim(),
            GuestPhone = request.GuestPhone.Trim(),
            GuestEmail = request.GuestEmail?.Trim().ToLower(),
            TableId = request.TableId,
            TableNumber = request.TableNumber,
            NumberOfPeople = request.NumberOfPeople,
            ReservationDate = request.ReservationDate.ToUniversalTime(),
            DepositAmount = request.DepositAmount,
            DepositStatus = request.DepositAmount > 0 ? request.DepositStatus : DepositStatus.None,
            Note = request.Note?.Trim(),
            Status = ReservationStatus.Booked,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _db.Reservations.InsertOneAsync(reservation);
        return ToDto(reservation);
    }

    public async Task<ReservationDto> UpdateAsync(string id, UpdateReservationRequest request)
    {
        var reservation = await _db.Reservations
            .Find(r => r.Id == id)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"Reservation {id} not found");

        if (reservation.Status == ReservationStatus.Cancelled)
            throw new ArgumentException("Cannot update a cancelled reservation");

        if (request.NumberOfPeople <= 0)
            throw new ArgumentException("Number of people must be greater than 0");

        if (request.ReservationDate <= DateTime.UtcNow)
            throw new ArgumentException("Reservation date must be in the future");

        var update = Builders<Domain.Entities.Reservation>.Update
            .Set(r => r.GuestName, request.GuestName.Trim())
            .Set(r => r.GuestPhone, request.GuestPhone.Trim())
            .Set(r => r.GuestEmail, request.GuestEmail?.Trim().ToLower())
            .Set(r => r.TableId, request.TableId)
            .Set(r => r.NumberOfPeople, request.NumberOfPeople)
            .Set(r => r.ReservationDate, request.ReservationDate.ToUniversalTime())
            .Set(r => r.DepositAmount, request.DepositAmount)
            .Set(r => r.Note, request.Note?.Trim())
            .Set(r => r.UpdatedAt, DateTime.UtcNow);

        await _db.Reservations.UpdateOneAsync(r => r.Id == id, update);

        // Return updated document
        var updated = await _db.Reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
        return ToDto(updated);
    }

    public async Task<ReservationDto> UpdateStatusAsync(string id, UpdateReservationStatusRequest request)
    {
        var reservation = await _db.Reservations
            .Find(r => r.Id == id)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"Reservation {id} not found");

        // Business rules: chỉ cho phép transition hợp lệ
        ValidateStatusTransition(reservation.Status, request.Status);

        var update = Builders<Domain.Entities.Reservation>.Update
            .Set(r => r.Status, request.Status)
            .Set(r => r.AccountId, request.AccountId)
            .Set(r => r.UpdatedAt, DateTime.UtcNow);

        await _db.Reservations.UpdateOneAsync(r => r.Id == id, update);
        var updated = await _db.Reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
        return ToDto(updated);
    }

    public async Task<ReservationDto> UpdateDepositStatusAsync(string id, UpdateDepositStatusRequest request)
    {
        var reservation = await _db.Reservations
            .Find(r => r.Id == id)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"Reservation {id} not found");

        var update = Builders<Domain.Entities.Reservation>.Update
            .Set(r => r.DepositStatus, request.DepositStatus)
            .Set(r => r.UpdatedAt, DateTime.UtcNow);

        await _db.Reservations.UpdateOneAsync(r => r.Id == id, update);
        var updated = await _db.Reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
        return ToDto(updated);
    }

    public async Task<ReservationDto> DeleteAsync(string id)
    {
        var reservation = await _db.Reservations
            .Find(r => r.Id == id)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"Reservation {id} not found");

        await _db.Reservations.DeleteOneAsync(r => r.Id == id);
        return ToDto(reservation);
    }

    // ─── Helpers ──────────────────────────────────────

    private static void ValidateCreate(CreateReservationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.GuestName))
            throw new ArgumentException("Guest name is required");

        if (string.IsNullOrWhiteSpace(request.GuestPhone))
            throw new ArgumentException("Guest phone is required");

        if (request.NumberOfPeople <= 0)
            throw new ArgumentException("Number of people must be greater than 0");

        if (request.ReservationDate <= DateTime.UtcNow)
            throw new ArgumentException("Reservation date must be in the future");

        if (request.DepositAmount < 0)
            throw new ArgumentException("Deposit amount cannot be negative");
    }

    private static void ValidateStatusTransition(ReservationStatus current, ReservationStatus next)
    {
        var allowed = current switch
        {
            ReservationStatus.Booked => new[] { ReservationStatus.CheckedIn, ReservationStatus.Cancelled },
            ReservationStatus.CheckedIn => new[] { ReservationStatus.Cancelled },
            ReservationStatus.Cancelled => Array.Empty<ReservationStatus>(),
            _ => Array.Empty<ReservationStatus>()
        };

        if (!allowed.Contains(next))
            throw new ArgumentException($"Cannot transition from {current} to {next}");
    }

    private static ReservationDto ToDto(Domain.Entities.Reservation r) => new(
        r.Id,
        r.GuestName,
        r.GuestPhone,
        r.GuestEmail,
        r.TableId,
        r.TableNumber,
        r.NumberOfPeople,
        r.Status.ToString(),
        r.ReservationDate,
        r.DepositAmount,
        r.DepositStatus.ToString(),
        r.Note,
        r.AccountId,
        r.CreatedAt,
        r.UpdatedAt);
}

// ─── Paginated Response (local — không dùng Shared vì MongoDB dùng long count) ──
public record PaginatedReservationResponse(
    IEnumerable<ReservationDto> Data,
    int Total,
    int Page,
    int PageSize)
{
    public int TotalPages => (int)Math.Ceiling((double)Total / PageSize);
}