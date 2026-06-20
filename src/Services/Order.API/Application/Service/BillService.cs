using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Order.API.Application.DTOs;
using Order.API.Domain.Entities;
using Order.API.Hubs;
using Order.API.Infrastructure.Persistence;
using Shared.DTOs;

namespace Order.API.Application.Service;

public class BillService
{
    private readonly OrderDbContext _db;
    private readonly IHubContext<OrderHub> _hub;

    public BillService(OrderDbContext db, IHubContext<OrderHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    // ─── Query ────────────────────────────────────────────────────────────────

    public async Task<PaginatedResponse<BillDto>> GetAllAsync(PaginationParams p)
    {
        var query = _db.Bills
            .Include(b => b.Table)
            .OrderByDescending(b => b.CreatedAt);

        var total = await query.CountAsync();
        var items = await query
            .Skip(p.Skip)
            .Take(p.Take)
            .ToListAsync();

        var dtos = new List<BillDto>();
        foreach (var bill in items)
        {
            var dto = await BuildBillDtoAsync(bill);
            dtos.Add(dto);
        }

        return new PaginatedResponse<BillDto>(dtos, total, p.Page, p.Take);
    }

    /// <summary>
    /// Lấy bill của session hiện tại cho một bàn.
    /// Nếu chưa có bill thì tạo mới dạng Unpaid (computed from orders).
    /// </summary>
    public async Task<BillDto> GetByTableAsync(int tableId)
    {
        var table = await _db.Tables.FindAsync(tableId)
            ?? throw new KeyNotFoundException($"Table {tableId} not found");

        // Tìm bill trong session hiện tại
        var bill = await _db.Bills
            .Include(b => b.Table)
            .FirstOrDefaultAsync(b => b.TableId == tableId && b.SessionId == table.SessionId);

        if (bill is not null)
            return await BuildBillDtoAsync(bill);

        // Không có bill → compute on-the-fly từ orders (không lưu DB)
        return await ComputeTransientBillAsync(table);
    }

    // ─── Mutations ────────────────────────────────────────────────────────────

    /// <summary>
    /// Guest bấm "Yêu cầu thanh toán".
    /// - Lấy guest hiện tại từ guestId (JWT claim)
    /// - Tạo / cập nhật Bill sang status Requested
    /// - Broadcast SignalR "BillRequested" → staff group
    /// </summary>
    public async Task<BillDto> RequestBillAsync(int guestId, Guid tokenSessionId)
    {
        var guest = await _db.Guests
            .Include(g => g.Table)
            .FirstOrDefaultAsync(g => g.Id == guestId)
            ?? throw new UnauthorizedAccessException("Phiên đã hết hạn, vui lòng quét QR lại");

        // Kiểm tra session còn hợp lệ
        if (guest.Table.SessionId != tokenSessionId)
            throw new UnauthorizedAccessException("Phiên đã hết hạn, vui lòng quét QR lại");

        var table = guest.Table;

        // Kiểm tra bàn đang có khách
        if (table.Status != TableStatus.Occupied)
            throw new ArgumentException("Bàn không ở trạng thái phục vụ");

        // Tìm hoặc tạo bill
        var bill = await _db.Bills
            .FirstOrDefaultAsync(b => b.TableId == table.Id && b.SessionId == table.SessionId);

        if (bill is null)
        {
            // Tính tổng tiền từ orders
            var total = await GetSessionTotalAsync(table.Id, table.SessionId);

            bill = new Bill
            {
                TableId = table.Id,
                SessionId = table.SessionId,
                GuestName = guest.Name,
                TotalAmount = total,
                Status = BillStatus.Requested,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Bills.Add(bill);
        }
        else
        {
            // Đã có bill — cập nhật tổng (có thể đã order thêm) và status
            if (bill.Status == BillStatus.Paid)
                throw new ArgumentException("Bàn này đã được thanh toán");

            bill.TotalAmount = await GetSessionTotalAsync(table.Id, table.SessionId);
            bill.Status = BillStatus.Requested;
            bill.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        // Load navigation cho DTO
        await _db.Entry(bill).Reference(b => b.Table).LoadAsync();
        var dto = await BuildBillDtoAsync(bill);

        // Broadcast realtime → staff
        await _hub.Clients.Group("staff").SendAsync("BillRequested", dto);

        return dto;
    }

    /// <summary>
    /// Staff xác nhận đã thu tiền → Bill.Status = Paid.
    /// Broadcast "BillPaid" → guest's table group.
    /// </summary>
    public async Task<BillDto> ConfirmPaymentAsync(int billId, int accountId)
    {
        var bill = await _db.Bills
            .Include(b => b.Table)
            .FirstOrDefaultAsync(b => b.Id == billId)
            ?? throw new KeyNotFoundException($"Bill {billId} not found");

        if (bill.Status == BillStatus.Paid)
            throw new ArgumentException("Bill đã được thanh toán rồi");

        bill.Status = BillStatus.Paid;
        bill.AccountId = accountId;
        bill.UpdatedAt = DateTime.UtcNow;


        var table = bill.Table;
        table.SessionId = Guid.NewGuid(); // reset session để bàn mới có session mới
        table.Status = TableStatus.Hidden; // Sau khi thanh toán, tạm ẩn bàn đi (không cho order mới) — chờ staff dọn dẹp và set lại Available
        table.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var dto = await BuildBillDtoAsync(bill);

        // Notify staff: cập nhật danh sách
        await _hub.Clients.Group("staff").SendAsync("BillPaid", dto);

        // Notify guest's table: hiển thị "Đã thanh toán"
        await _hub.Clients.Group($"table-{bill.Table.Number}").SendAsync("BillPaid", dto);

        return dto;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Tính tổng tiền các order non-cancelled trong session hiện tại của bàn.
    /// </summary>
    private async Task<decimal> GetSessionTotalAsync(int tableId, Guid sessionId)
    {
        // Lấy tất cả guestId thuộc session này
        var guestIds = await _db.Guests
            .Where(g => g.TableId == tableId && g.SessionId == sessionId)
            .Select(g => g.Id)
            .ToListAsync();

        return await _db.Orders
            .Where(o => guestIds.Contains(o.GuestId)
                     && o.Status != OrderStatus.Cancelled)
            .SumAsync(o => o.DishPrice * o.Quantity);
    }

    /// <summary>
    /// Xây BillDto từ entity — lấy order items cho session.
    /// </summary>
    private async Task<BillDto> BuildBillDtoAsync(Bill bill)
    {
        var guestIds = await _db.Guests
            .Where(g => g.TableId == bill.TableId && g.SessionId == bill.SessionId)
            .Select(g => g.Id)
            .ToListAsync();

        // Lấy tên guest đầu tiên (người yêu cầu) nếu bill chưa lưu guestName
        var guestName = bill.GuestName;
        if (string.IsNullOrEmpty(guestName) && guestIds.Any())
        {
            guestName = await _db.Guests
                .Where(g => guestIds.Contains(g.Id))
                .OrderBy(g => g.CreatedAt)
                .Select(g => g.Name)
                .FirstOrDefaultAsync() ?? "Khách";
        }

        var orders = await _db.Orders
            .Where(o => guestIds.Contains(o.GuestId) && o.Status != OrderStatus.Cancelled)
            .OrderBy(o => o.CreatedAt)
            .ToListAsync();

        var items = orders.Select(o => new BillOrderItemDto(
            o.DishSnapshotId,
            o.DishName,
            o.DishImage,
            o.Quantity,
            o.DishPrice,
            o.DishPrice * o.Quantity,
            o.Status.ToString()
        ));

        return new BillDto(
            bill.Id,
            bill.TableId,
            bill.Table.Number,
            guestName,
            bill.SessionId.ToString(),
            items,
            bill.TotalAmount,
            bill.Status.ToString(),
            bill.AccountId,
            bill.CreatedAt,
            bill.UpdatedAt);
    }

    /// <summary>
    /// Tạo BillDto tạm (không có Id) khi chưa có bill entity trong DB.
    /// Dùng khi staff xem bill của bàn chưa request.
    /// </summary>
    private async Task<BillDto> ComputeTransientBillAsync(Table table)
    {
        var guestIds = await _db.Guests
            .Where(g => g.TableId == table.Id && g.SessionId == table.SessionId)
            .Select(g => g.Id)
            .ToListAsync();

        var guestName = await _db.Guests
            .Where(g => guestIds.Contains(g.Id))
            .OrderBy(g => g.CreatedAt)
            .Select(g => g.Name)
            .FirstOrDefaultAsync() ?? "Khách";

        var orders = await _db.Orders
            .Where(o => guestIds.Contains(o.GuestId) && o.Status != OrderStatus.Cancelled)
            .OrderBy(o => o.CreatedAt)
            .ToListAsync();

        var items = orders.Select(o => new BillOrderItemDto(
            o.DishSnapshotId,
            o.DishName,
            o.DishImage,
            o.Quantity,
            o.DishPrice,
            o.DishPrice * o.Quantity,
            o.Status.ToString()
        )).ToList();

        var total = items.Sum(i => i.Subtotal);

        return new BillDto(
            0, // no DB id yet
            table.Id,
            table.Number,
            guestName,
            table.SessionId.ToString(),
            items,
            total,
            BillStatus.Unpaid.ToString(),
            null,
            DateTime.UtcNow,
            DateTime.UtcNow);
    }
}