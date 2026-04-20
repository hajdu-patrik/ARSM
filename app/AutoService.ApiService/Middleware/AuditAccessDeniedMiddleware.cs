namespace AutoService.ApiService.Middleware;

/**
 * Middleware that emits a structured audit warning for 401 (unauthenticated) and
 * 403 (forbidden) responses produced by the authentication and authorization pipeline.
 * Must be registered before UseAuthentication() so it wraps the full auth pipeline
 * and can observe the final response status code on the way out.
 */
public class AuditAccessDeniedMiddleware(RequestDelegate next)
{
    /**
     * Invokes the next middleware, then logs a warning if the response status is 401 or 403.
     *
     * @param context The current HTTP context.
     * @param loggerFactory Factory used to create the audit logger.
     */
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
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown");
        }
    }
}
