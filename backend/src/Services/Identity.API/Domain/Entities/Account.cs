namespace Identity.API.Domain.Entities
{
    public enum UserRole
    {
        SuperAdmin = 1,
        Admin = 2,
        Staff = 3
    }
    public class Account
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Avatar { get; set; } = string.Empty;
        public UserRole Role { get; set; } = UserRole.Staff;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    }
}
