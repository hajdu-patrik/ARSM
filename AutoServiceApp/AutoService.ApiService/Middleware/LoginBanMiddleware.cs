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

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase))
        {
            var key = ResolveClientKey(context);
            var now = DateTimeOffset.UtcNow;

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

    public static void BanClient(HttpContext context)
    {
        var key = ResolveClientKey(context);
        var blockedUntil = DateTimeOffset.UtcNow.Add(BanWindow);
        BannedClients.AddOrUpdate(key, blockedUntil, (_, existing) => existing > blockedUntil ? existing : blockedUntil);
    }

    public static int BanWindowSeconds => (int)Math.Ceiling(BanWindow.TotalSeconds);

    private static string ResolveClientKey(HttpContext context)
    {
        var ip = context.Connection.RemoteIpAddress?.ToString();
        return string.IsNullOrWhiteSpace(ip) ? "unknown" : ip;
    }
}
