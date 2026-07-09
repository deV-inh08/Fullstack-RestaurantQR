using Microsoft.AspNetCore.SignalR;

namespace Order.API.Hubs;

/// <summary>
/// SignalR Hub quản lý real-time cho Order.
///
/// Groups:
///   "staff"        → Admin/Staff nhận notification mọi order mới / cập nhật
///   "table-{id}"   → Guest nhận status update của đơn hàng theo bàn
/// </summary>
public class OrderHub : Hub
{
    private readonly ILogger<OrderHub> _logger;

    public OrderHub(ILogger<OrderHub> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Staff/Admin gọi khi kết nối → join group "staff"
    /// </summary>
    public async Task JoinStaffGroup()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "staff");
        _logger.LogInformation("Connection {Id} joined staff group", Context.ConnectionId);
    }

    /// <summary>
    /// Guest gọi khi kết nối → join group "table-{tableId}"
    /// </summary>
    public async Task JoinTableGroup(int tableId)
    {
        var groupName = $"table-{tableId}";
        //await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        await Groups.AddToGroupAsync(Context.ConnectionId, $"table-{tableId}");
        _logger.LogInformation("Connection {Id} joined {Group}", Context.ConnectionId, groupName);
    }


    /// <summary>
    /// Guest rời group khi đóng tab (cleanup)
    /// </summary>
    public async Task LeaveTableGroup(int tableId)
    {
        var groupName = $"table-{tableId}";
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
    }



    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Connection {Id} disconnected", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}