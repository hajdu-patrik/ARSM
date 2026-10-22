using System.Collections.Concurrent;
using AutoService.ApiService.Data;
using AutoService.ApiService.Security;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Auth.Security;

internal interface ITokenDenylistService
{
    Task RevokeAsync(string jwtId, DateTimeOffset expiresAtUtc, CancellationToken cancellationToken = default);
    Task<bool> IsRevokedAsync(string jwtId, CancellationToken cancellationToken = default);
}

/** Access-token denylist with the live rows in memory: warmed from the table at startup, so an
    authenticated request never queries the database; the table only survives restarts (single instance). */
internal sealed class TokenDenylistService(
    IServiceScopeFactory scopeFactory,
    ILogger<TokenDenylistService> logger) : ITokenDenylistService, IHostedService
{
    private readonly ConcurrentDictionary<string, DateTime> revokedUntilUtc = new(StringComparer.Ordinal);
    private volatile bool warmed;

    /** Loads the non-expired rows; a failure keeps the per-request database fallback on instead of failing startup. */
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AutoServiceDbContext>();
            var nowUtc = DateTime.UtcNow;
            var rows = await db.RevokedJwtTokens
                .Where(x => x.ExpiresAtUtc > nowUtc)
                .Select(x => new { x.JwtId, x.ExpiresAtUtc })
                .ToListAsync(cancellationToken);

            foreach (var row in rows)
            {
                revokedUntilUtc[row.JwtId] = row.ExpiresAtUtc;
            }

            warmed = true;
            logger.LogInformation("Token denylist warmed with {Count} live entries.", rows.Count);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError(exception, "Token denylist warm-up failed; falling back to database lookups.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public async Task RevokeAsync(string jwtId, DateTimeOffset expiresAtUtc, CancellationToken cancellationToken = default)
    {
        var expiresAtUtcDateTime = expiresAtUtc.UtcDateTime;
        if (expiresAtUtcDateTime <= DateTime.UtcNow)
        {
            return;
        }

        revokedUntilUtc[jwtId] = expiresAtUtcDateTime;
        PruneExpired();

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoServiceDbContext>();

        var existing = await db.RevokedJwtTokens
            .FirstOrDefaultAsync(x => x.JwtId == jwtId, cancellationToken);

        if (existing is null)
        {
            db.RevokedJwtTokens.Add(new RevokedJwtToken(jwtId, DateTime.UtcNow, expiresAtUtcDateTime));
        }
        else
        {
            existing.ExtendExpiry(expiresAtUtcDateTime);
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> IsRevokedAsync(string jwtId, CancellationToken cancellationToken = default)
    {
        var nowUtc = DateTime.UtcNow;
        if (revokedUntilUtc.TryGetValue(jwtId, out var expiresAtUtc) && expiresAtUtc > nowUtc)
        {
            return true;
        }

        if (warmed)
        {
            return false;
        }

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoServiceDbContext>();

        var storedExpiry = await db.RevokedJwtTokens
            .Where(x => x.JwtId == jwtId && x.ExpiresAtUtc > nowUtc)
            .Select(x => (DateTime?)x.ExpiresAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (!storedExpiry.HasValue)
        {
            return false;
        }

        revokedUntilUtc[jwtId] = storedExpiry.Value;
        return true;
    }

    private void PruneExpired()
    {
        var nowUtc = DateTime.UtcNow;

        foreach (var entry in revokedUntilUtc)
        {
            if (entry.Value <= nowUtc)
            {
                revokedUntilUtc.TryRemove(entry);
            }
        }
    }
}
