using AutoService.ApiService.Identity;
using AutoService.ApiService.Security;

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
            var mechanicId = context.User?.FindFirst(PersonIdClaim.Type)?.Value;

            logger.LogWarning(
                "Access denied ({StatusCode}). MechanicId: {MechanicId}, Method: {Method}, Path: {Path}, IP: {ClientIp}.",
                context.Response.StatusCode,
                mechanicId,
                context.Request.Method,
                context.Request.Path,
                ClientIpAddress.Hash(context) ?? "unknown");
        }
    }
}
