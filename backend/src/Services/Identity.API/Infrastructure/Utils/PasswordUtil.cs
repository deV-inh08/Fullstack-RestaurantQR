using Identity.API.Application.Interfaces;

namespace Identity.API.Infrastructure.Utils
{
    public class PasswordUtil : IPasswordUtil
    {
        private const int WorkFactor = 12;

        public string Hash(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);

        }

        public bool Verify(string password, string hash)
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }
    }
}
