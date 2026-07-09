namespace Order.API.Domain.Entities
{
    public enum BillStatus
    {
        Unpaid = 1,    // Chưa yêu cầu
        Requested = 2, // Guest đã bấm "Yêu cầu thanh toán"
        Paid = 3       // Staff đã xác nhận thanh toán
    }

    public class Bill
    {
        public int Id { get; set; }
        public int TableId { get; set; }

        /// <summary>
        /// Snapshot của Table.SessionId tại thời điểm bill được tạo.
        /// Dùng để aggregate đúng các order trong session hiện tại.
        /// </summary>
        public Guid SessionId { get; set; }

        public string GuestName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public BillStatus Status { get; set; } = BillStatus.Unpaid;

        /// <summary>Staff xác nhận thanh toán</summary>
        public int? AccountId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Table Table { get; set; } = null!;
    }
}