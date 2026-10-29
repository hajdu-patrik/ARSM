using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Security;

/** Loads the persisted session cutoffs that can still match a live token into the in-memory cache at startup,
    so a restart no longer forgets them; a failed load keeps memory-only behaviour, an invalid timeout fails startup. */
internal sealed class SessionRevocationWarmupService(
    IServiceScopeFactory scopeFactory,
    ISessionRevocationService sessionRevocation,
    IConfiguration configuration,
    ILogger<SessionRevocationWarmupService> logger) : IHostedService
{
    // Resolved when the host builds its hosted services, outside the catch below, so a bad value stops startup.
    private readonly TimeSpan warmupTimeout = SessionRevocationSettingsResolver.ResolveWarmupTimeout(configuration);

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(warmupTimeout);

        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AutoServiceDbContext>();

            var oldestUseful = OldestUsefulCutoff(DateTime.UtcNow);
            var rows = await db.People
                .AsNoTracking()
                .Where(p => p.TokensValidAfter != null && p.TokensValidAfter > oldestUseful)
                .Select(p => new { p.Id, p.TokensValidAfter })
                .ToListAsync(timeout.Token);

            foreach (var row in rows)
            {
                sessionRevocation.Seed(row.Id, row.TokensValidAfter!.Value);
            }

            logger.LogInformation("Session revocation cutoffs warmed with {Count} live entries.", rows.Count);
        }
        catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(
                "Session revocation warm-up failed ({ExceptionType}); continuing with the in-memory cutoffs only.",
                exception.GetType().Name);
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    /** The same retention the in-memory prune uses: an older cutoff can never match a token again. */
    internal static DateTime OldestUsefulCutoff(DateTime nowUtc)
        => nowUtc - (AuthEndpoints.AccessTokenTtl + AuthEndpoints.ClockSkew);
}
