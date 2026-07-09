using System.ComponentModel.DataAnnotations;

namespace Identity.API.Domain.Entities
{
    public class RefreshToken
    {
        [Key]
        public string Token { get; set; } = String.Empty;
        public int AccountId { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; }

        // Navigation
        public Account Account { get; set; } = null!;
    }
}
