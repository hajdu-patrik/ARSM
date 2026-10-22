using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Middleware;

/** A session on a temporary password may only change it, validate, refresh or log out; everything else under
    /api answers 403 password_change_required. Runs after authorization, so it sees the validated principal. */
public sealed class PasswordChangeRequiredMiddleware(RequestDelegate next)
{
    private static readonly HashSet<string> AllowedPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/profile/change-password",
        "/api/auth/logout",
        "/api/auth/refresh",
        "/api/auth/validate",
    };

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path;

        if (path.StartsWithSegments("/api") &&
            !AllowedPaths.Contains(path.Value ?? string.Empty) &&
            context.User.HasClaim(PasswordChangeRequiredClaim.Type, PasswordChangeRequiredClaim.Value))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new ErrorCodeResponse("password_change_required"), context.RequestAborted);
            return;
        }

        await next(context);
    }
}
