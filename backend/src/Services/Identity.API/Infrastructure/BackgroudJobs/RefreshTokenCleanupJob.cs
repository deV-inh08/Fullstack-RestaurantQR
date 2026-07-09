
using Identity.API.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Identity.API.Infrastructure.BackgroundJobs;

/// Background job chạy mỗi 6 tiếng, xóa RefreshToken đã hết hạn.
/// Ngăn bảng RefreshTokens phình to theo thời gian.
public class RefreshTokenCleanupJob : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RefreshTokenCleanupJob> _logger;

    // Chạy mỗi 6 tiếng
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    public RefreshTokenCleanupJob(
        IServiceScopeFactory scopeFactory,
        ILogger<RefreshTokenCleanupJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("RefreshToken cleanup job started");

        // Chạy lần đầu sau 1 phút để không block startup
        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            await CleanupExpiredTokensAsync(stoppingToken);
            await Task.Delay(Interval, stoppingToken);
        }
    }

    private async Task CleanupExpiredTokensAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();

            var cutoff = DateTime.UtcNow;
            var deleted = await db.RefreshTokens
                .Where(rt => rt.ExpiresAt < cutoff)
                .ExecuteDeleteAsync(cancellationToken);

            if (deleted > 0)
                _logger.LogInformation(
                    "Cleaned up {Count} expired refresh tokens at {Time}",
                    deleted, DateTime.UtcNow);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Error during refresh token cleanup");
        }
    }
}