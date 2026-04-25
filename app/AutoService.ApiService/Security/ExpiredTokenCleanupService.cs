using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Security;

/**
 * Background service that periodically removes expired refresh tokens
 * and revoked JWT denylist entries to prevent unbounded table growth.
 */
internal sealed class ExpiredTokenCleanupService(
    IServiceScopeFactory scopeFactory,
    ILogger<ExpiredTokenCleanupService> logger) : BackgroundService
{
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(CleanupInterval, stoppingToken);
                await CleanupAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Expired token cleanup failed.");
            }
        }
    }

    private async Task CleanupAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoServiceDbContext>();
        var nowUtc = DateTime.UtcNow;

        var deletedJwtTokens = await db.RevokedJwtTokens
            .Where(t => t.ExpiresAtUtc <= nowUtc)
            .ExecuteDeleteAsync(cancellationToken);

        var deletedRefreshTokens = await db.RefreshTokens
            .Where(t => t.ExpiresAtUtc <= nowUtc && t.RevokedAtUtc != null)
            .ExecuteDeleteAsync(cancellationToken);

        if (deletedJwtTokens > 0 || deletedRefreshTokens > 0)
        {
            logger.LogInformation(
                "Token cleanup removed {JwtCount} expired JWT denylist entries and {RefreshCount} expired refresh tokens.",
                deletedJwtTokens,
                deletedRefreshTokens);
        }
    }
}
