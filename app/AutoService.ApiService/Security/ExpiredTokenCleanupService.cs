using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Security;

/** Background service that periodically removes expired refresh tokens (revoked or not) and expired JWT denylist entries to prevent unbounded table growth. */
internal sealed class ExpiredTokenCleanupService(
    IServiceScopeFactory scopeFactory,
    ILogger<ExpiredTokenCleanupService> logger,
    TimeProvider? timeProvider = null) : BackgroundService
{
    // The first pass comes soon after start: an API that scales to zero rarely lives a full interval.
    internal static readonly TimeSpan FirstCleanupDelay = TimeSpan.FromMinutes(1);
    internal static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(1);

    private readonly TimeProvider clock = timeProvider ?? TimeProvider.System;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var delay = FirstCleanupDelay;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(delay, clock, stoppingToken);
                delay = CleanupInterval;
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
            .Where(t => t.ExpiresAtUtc <= nowUtc)
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
