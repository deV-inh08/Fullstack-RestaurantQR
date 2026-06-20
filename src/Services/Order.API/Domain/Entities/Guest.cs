namespace Order.API.Domain.Entities
{


    public class Guest
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int TableId { get; set; }
        public int TableNumber { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// Snapshot của Table.SessionId tại thời điểm Guest login.
        /// Dùng để phát hiện bàn đã bị reset sau khi Guest này vào.
        public Guid SessionId { get; set; }

        // Navigation
        public Table Table { get; set; } = null!;
        public ICollection<Order> Orders { get; set; } = new List<Order>();
    }
}
