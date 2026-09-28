using System.Security.Cryptography;
using System.Text;

namespace AutoService.ApiService.Middleware;

/** Emits a structured audit warning on 401/403 responses; must be registered before
    UseAuthentication() so it wraps the full auth pipeline and sees the final status code. */
public class AuditAccessDeniedMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, ILoggerFactory loggerFactory)
    {
        await next(context);

        if (context.Response.StatusCode is 401 or 403)
        {
            var logger = loggerFactory.CreateLogger("Auth.AccessDenied");
            var mechanicId = context.User?.FindFirst("person_id")?.Value;

            logger.LogWarning(
                "Access denied ({StatusCode}). MechanicId: {MechanicId}, Method: {Method}, Path: {Path}, IP: {ClientIp}.",
                context.Response.StatusCode,
                mechanicId,
                context.Request.Method,
                context.Request.Path,
                HashClientIp(context.Connection.RemoteIpAddress?.ToString()));
        }
    }

    private static string HashClientIp(string? ip)
    {
        if (string.IsNullOrWhiteSpace(ip)) return "unknown";
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(ip));
        return $"sha256:{Convert.ToHexString(hash)[..12]}";
    }
}
