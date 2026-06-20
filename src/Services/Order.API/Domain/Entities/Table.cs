namespace Order.API.Domain.Entities
{
    public enum TableStatus
    {
        Available = 1, // Bàn có thể đặt (Quét được QR)
        Occupied = 2, // Bàn đã có khách (Quét được QR)
        Hidden = 3 // Bàn không có khách (Không quét được QR)
    }
    public class Table
    {
        public int Id { get; set; } // PK
        public int Number { get; set; }
        public int Capacity { get; set; }
        public TableStatus Status { get; set; } = TableStatus.Available;
        public bool IsVisibleOnReservation { get; set; } = true;

        // Dùng để vô hiệu hoá GuestToken cũ mà không xoá lịch sử
        public Guid SessionId { get; set; } = Guid.NewGuid();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        // Navigation
        public ICollection<Guest> Guests { get; set; } = new List<Guest>();
        public ICollection<Order> Orders { get; set; } = new List<Order>();
    }
}
