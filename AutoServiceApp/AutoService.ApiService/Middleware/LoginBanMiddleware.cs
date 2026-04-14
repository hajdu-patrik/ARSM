/**
 * LoginBanMiddleware.cs
 *
 * Auto-generated documentation header for this source file.
 */

using System.Collections.Concurrent;
using System.Globalization;

namespace AutoService.ApiService.Middleware;

/**
 * Middleware that enforces a temporary 3-minute ban on login attempts
 * after the fixed-window rate limiter rejects a client.
 */
public sealed class LoginBanMiddleware(RequestDelegate next)
{
    private static readonly ConcurrentDictionary<string, DateTimeOffset> BannedClients = new();
    private static readonly TimeSpan BanWindow = TimeSpan.FromMinutes(3);
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromSeconds(30);
    private const int MaxTrackedClients = 5000;
    private static long _nextCleanupAtUnixMilliseconds = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        /**
         * InvokeAsync operation.
         *
         * @param context Parameter.
         * @returns Return value.
         */
        public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase))
        {
            var key = ResolveClientKey(context);
            var now = DateTimeOffset.UtcNow;
            CleanupExpiredEntries(now);

            if (BannedClients.TryGetValue(key, out var blockedUntil))
            {
                if (blockedUntil > now)
                {
                    var retryAfterSeconds = (int)Math.Ceiling((blockedUntil - now).TotalSeconds);
                    context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                    context.Response.Headers.RetryAfter = retryAfterSeconds.ToString(CultureInfo.InvariantCulture);
                    await context.Response.WriteAsJsonAsync(new
                    {
                        code = "login_banned",
                        error = "Too many login attempts. Try again in 3 minutes.",
                        retryAfterSeconds
                    });
                    return;
                }

                BannedClients.TryRemove(key, out _);
            }
        }

        await next(context);
    }

        /**
         * BanClient operation.
         *
         * @param context Parameter.
         */
        public static void BanClient(HttpContext context)
    {
        var key = ResolveClientKey(context);
        var now = DateTimeOffset.UtcNow;

        CleanupExpiredEntries(now);

        if (BannedClients.Count >= MaxTrackedClients && !BannedClients.ContainsKey(key))
        {
            TrimToBound(now);

            if (BannedClients.Count >= MaxTrackedClients)
            {
                return;
            }
        }

        var blockedUntil = now.Add(BanWindow);
        BannedClients.AddOrUpdate(key, blockedUntil, (_, existing) => existing > blockedUntil ? existing : blockedUntil);
    }

    public static int BanWindowSeconds => (int)Math.Ceiling(BanWindow.TotalSeconds);

        private static string ResolveClientKey(HttpContext context)
    {
        var ip = context.Connection.RemoteIpAddress?.ToString();
        return string.IsNullOrWhiteSpace(ip) ? "unknown" : ip;
    }

    private static void CleanupExpiredEntries(DateTimeOffset now, bool force = false)
    {
        if (!force)
        {
            var nowUnixMilliseconds = now.ToUnixTimeMilliseconds();
            var scheduledCleanupAt = Volatile.Read(ref _nextCleanupAtUnixMilliseconds);

            if (nowUnixMilliseconds < scheduledCleanupAt)
            {
                return;
            }

            var nextCleanupAt = nowUnixMilliseconds + (long)CleanupInterval.TotalMilliseconds;
            if (Interlocked.CompareExchange(ref _nextCleanupAtUnixMilliseconds, nextCleanupAt, scheduledCleanupAt) != scheduledCleanupAt)
            {
                return;
            }
        }

        foreach (var entry in BannedClients)
        {
            if (entry.Value <= now)
            {
                BannedClients.TryRemove(entry.Key, out _);
            }
        }
    }

        private static void TrimToBound(DateTimeOffset now)
    {
        CleanupExpiredEntries(now, force: true);

        var overflow = (BannedClients.Count - MaxTrackedClients) + 1;
        if (overflow <= 0)
        {
            return;
        }

        var keysToRemove = BannedClients
            .OrderBy(entry => entry.Value)
            .ThenBy(entry => entry.Key, StringComparer.Ordinal)
            .Take(overflow)
            .Select(entry => entry.Key)
            .ToArray();

        foreach (var key in keysToRemove)
        {
            BannedClients.TryRemove(key, out _);
        }
    }
}
