using AutoService.ApiService.Data;
using AutoService.ApiService.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;

namespace AutoService.ApiService.Auth.Security;

internal interface ITokenDenylistService
{
    Task RevokeAsync(string jwtId, DateTimeOffset expiresAtUtc, CancellationToken cancellationToken = default);
    Task<bool> IsRevokedAsync(string jwtId, CancellationToken cancellationToken = default);
}

internal sealed class TokenDenylistService(
    IMemoryCache memoryCache,
    IServiceScopeFactory scopeFactory) : ITokenDenylistService
{
    private const string KeyPrefix = "denylist-jti:";

    public async Task RevokeAsync(string jwtId, DateTimeOffset expiresAtUtc, CancellationToken cancellationToken = default)
    {
        var remaining = expiresAtUtc - DateTimeOffset.UtcNow;
        if (remaining <= TimeSpan.Zero)
        {
            return;
        }

        memoryCache.Set(BuildKey(jwtId), true, remaining);

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoServiceDbContext>();
        var revokedAtUtc = DateTime.UtcNow;
        var expiresAtUtcDateTime = expiresAtUtc.UtcDateTime;

        var existing = await db.RevokedJwtTokens
            .FirstOrDefaultAsync(x => x.JwtId == jwtId, cancellationToken);

        if (existing is null)
        {
            db.RevokedJwtTokens.Add(new RevokedJwtToken(jwtId, revokedAtUtc, expiresAtUtcDateTime));
        }
        else
        {
            existing.ExtendExpiry(expiresAtUtcDateTime);
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> IsRevokedAsync(string jwtId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var cacheKey = BuildKey(jwtId);
        if (memoryCache.TryGetValue(cacheKey, out _))
        {
            return true;
        }

        var nowUtc = DateTime.UtcNow;
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoServiceDbContext>();

        var expiresAtUtc = await db.RevokedJwtTokens
            .Where(x => x.JwtId == jwtId && x.ExpiresAtUtc > nowUtc)
            .Select(x => (DateTime?)x.ExpiresAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (!expiresAtUtc.HasValue)
        {
            return false;
        }

        memoryCache.Set(cacheKey, true, expiresAtUtc.Value - nowUtc);
        return true;
    }

    private static string BuildKey(string jwtId) => $"{KeyPrefix}{jwtId}";
}
