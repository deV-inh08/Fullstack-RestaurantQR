using Microsoft.EntityFrameworkCore;
using Order.API.Application.DTOs;
using Order.API.Application.Interfaces;
using Order.API.Domain.Entities;
using Order.API.Infrastructure.Persistence;
using Order.API.Infrastructure.Utils;
using System.Security.Claims;

namespace Order.API.Application.Service;

public class GuestService
{
    private readonly OrderDbContext _db;
    private readonly IGuestJwtUtil _jwtUtil;

    public GuestService(OrderDbContext db, IGuestJwtUtil jwtUtil)
    {
        _db = db;
        _jwtUtil = jwtUtil;
    }

    public async Task<GuestLoginResponse> LoginAsync(GuestLoginRequest request)
    {
        var table = await _db.Tables
            .FirstOrDefaultAsync(t => t.Number == request.TableNumber)
            ?? throw new KeyNotFoundException("Table not found");
        Console.WriteLine($"table.Status__________________________________{table.Status}");
        if (table.Status != TableStatus.Available)
            throw new ArgumentException("Table is not available");

        var guest = new Guest
        {
            Name = request.Name.Trim(),
            TableId = table.Id,        // ← FK đúng → PK của Table
            TableNumber = table.Number, // ← số bàn hiển thị, đưa vào JWT
            SessionId = table.SessionId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Guests.Add(guest);

        // Đổi bàn → Occupied
        table.Status = TableStatus.Occupied;
        table.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var accessToken = _jwtUtil.GenerateAccessToken(guest, table.SessionId);
        var refreshToken = _jwtUtil.GenerateRefreshToken(guest, table.SessionId);

        return new GuestLoginResponse(ToDto(guest, table), accessToken, refreshToken);
    }

    public async Task<GuestLoginResponse> RefreshTokenAsync(GuestRefreshTokenRequest request)
    {
        // Validate refresh token signature + expiry
        ClaimsPrincipal principal;
        try
        {
            principal = _jwtUtil.ValidateToken(request.RefreshToken, isRefreshToken: true);
        }
        catch
        {
            throw new UnauthorizedAccessException("Refresh token is invalid or has expired");
        }

        var guestId = int.Parse(principal.FindFirst("guestId")!.Value);
        var tokenSessionId = Guid.Parse(principal.FindFirst("sessionId")!.Value);

        var guest = await _db.Guests
            .Include(g => g.Table)
            .FirstOrDefaultAsync(g => g.Id == guestId)
            ?? throw new UnauthorizedAccessException("Session has expired, please scan the QR code again");

        // So sánh sessionId trong token với sessionId hiện tại của bàn
        // Nếu Staff đã reset bàn → SessionId đổi → từ chối
        if (guest.Table.SessionId != tokenSessionId)
            throw new UnauthorizedAccessException("Session has expired, please scan the QR code again");

        var newAccessToken = _jwtUtil.GenerateAccessToken(guest, guest.Table.SessionId);
        var newRefreshToken = _jwtUtil.GenerateRefreshToken(guest, guest.Table.SessionId);

        return new GuestLoginResponse(ToDto(guest, guest.Table), newAccessToken, newRefreshToken);
    }

    private static GuestDto ToDto(Guest g, Table t) => new(
        g.Id, g.Name, g.TableId, t.Number, g.CreatedAt);
}