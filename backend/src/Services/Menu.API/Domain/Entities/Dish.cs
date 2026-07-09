namespace Menu.API.Domain.Entities
{
    public enum DishStatus
    {
        // Món ăn đang sẵn sàng phục vụ
        Available = 1,

        // Món ăn tạm thời hết (do hết nguyên liệu trong ngày)
        OutOfStock = 2,
    }

    public enum DishCategory
    {
        MainCourse = 1, // Món chính
        Dessert = 2,    // Tráng miệng
        Beverage = 3    // Nước uống
    }
    public class Dish
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Price { get; set; }
        public string? Description { get; set; }
        public string? ImagePath { get; set; }
        public DishCategory Category { get; set; } = DishCategory.MainCourse;
        public DishStatus Status { get; set; } = DishStatus.Available;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<DishSnapshot> Snapshots { get; set; } = new List<DishSnapshot>();
    }
}
