using System.ComponentModel.DataAnnotations.Schema;

namespace Menu.API.Domain.Entities
{
    public class DishSnapshot
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Price { get; set; }
        public string? Description { get; set; }
        public DishCategory Category { get; set; } = DishCategory.MainCourse;
        public string? ImagePath { get; set; }
        public int DishId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [ForeignKey("DishId")]
        public Dish Dish { get; set; } = null!;
    }
}
