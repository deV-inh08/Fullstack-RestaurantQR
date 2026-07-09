using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Order.API.Application.DTOs;
using Order.API.Domain.Entities;
using Order.API.Hubs;
using Order.API.Infrastructure.Persistence;
using Shared.DTOs;
using System.Xml;

namespace Order.API.Application.Service;

public class TableService
{
    private readonly OrderDbContext _db;
    private readonly IHubContext<OrderHub> _hub;
    public TableService(OrderDbContext db, IHubContext<OrderHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    public async Task<PaginatedResponse<TableDto>> GetAllAsync(PaginationParams p)
    {
        var query = _db.Tables.OrderBy(t => t.Number);
        var total = await query.CountAsync();
        var items = await query
            .Skip(p.Skip)
            .Take(p.Take)
            .ToListAsync();
        return new PaginatedResponse<TableDto>(items.Select(ToDto), total, p.Page, p.Take);
    }

    public async Task<TableDto> GetByIdAsync(int id)
    {
        var table = await _db.Tables.FindAsync(id)
            ?? throw new KeyNotFoundException("Table not found");
        return ToDto(table);
    }

    public async Task<TableDto> CreateAsync(CreateTableRequest request)
    {
        if (await _db.Tables.AnyAsync(t => t.Number == request.Number))
            throw new ArgumentException($"Table number {request.Number} already exists");

        var table = new Table
        {
            Number = request.Number,
            Capacity = request.Capacity,
            Status = TableStatus.Available,
            SessionId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Tables.Add(table);
        await _db.SaveChangesAsync();
        return ToDto(table);
    }

    public async Task<TableDto> UpdateStatusAsync(int id, UpdateTableStatusRequest request)
    {
        var table = await _db.Tables.FindAsync(id)
            ?? throw new KeyNotFoundException("Table not found");

        table.Status = request.Status;
        table.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        var dto = ToDto(table);
        // 2. Gửi sự kiện realtime cho Admin (những người ở group "staff")
        await _hub.Clients.Group("staff").SendAsync("TableStatusChanged", dto);
        return dto;
    }


    // ← NEW: toggle IsVisibleOnReservation
    public async Task<TableDto> UpdateVisibilityAsync(int id, UpdateTableVisibilityRequest request)
    {
        var table = await _db.Tables.FindAsync(id)
            ?? throw new KeyNotFoundException("Table not found");

        table.IsVisibleOnReservation = request.IsVisibleOnReservation;
        table.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ToDto(table);
    }

    // Gọi khi khách rời bàn — vô hiệu hoá tất cả GuestToken cũ
    public async Task<TableDto> ResetTableAsync(int id)
    {
        var table = await _db.Tables.FindAsync(id)
            ?? throw new KeyNotFoundException("Table not found");

        table.SessionId = Guid.NewGuid(); // Token cũ hết hiệu lực
        table.Status = TableStatus.Hidden;
        table.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ToDto(table);
    }

    public async Task<TableDto> DeleteAsync(int id)
    {
        var table = await _db.Tables.FindAsync(id)
            ?? throw new KeyNotFoundException("Table not found");

        _db.Tables.Remove(table);
        await _db.SaveChangesAsync();
        return ToDto(table);
    }

    public async Task<object> GetByNumberPublicAsync(int number)
    {
        var table = await _db.Tables.FirstOrDefaultAsync(t => t.Number == number)
            ?? throw new KeyNotFoundException("Table not found");

        return new
        {
            table.Id,
            table.Number,
            table.Status  // FE check Hidden/Available
        };
    }

    public async Task<List<ReservationTableDto>> GetAvailableForReservationAsync()
    {
        var tables = await _db.Tables
            .Where(t => t.IsVisibleOnReservation)
            .OrderBy(t => t.Number)
            .ToListAsync();
        return tables.Select(t => new ReservationTableDto(t.Id, t.Number, t.Capacity, t.Status.ToString())).ToList();
    }

    public static TableDto ToDto(Table t) => new(
        t.Id, t.Number, t.Capacity, t.Status.ToString(),
        t.IsVisibleOnReservation, t.CreatedAt, t.UpdatedAt);
}