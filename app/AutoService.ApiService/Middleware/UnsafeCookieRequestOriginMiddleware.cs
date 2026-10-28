using AutoService.ApiService.Configuration;

namespace AutoService.ApiService.Middleware;

/** Blocks browser-style unsafe API requests with auth cookies unless Origin matches the configured WebUI. */
public sealed class UnsafeCookieRequestOriginMiddleware(RequestDelegate next, WebUiOriginPolicy originPolicy)
{
    private const string LoginPath = "/api/auth/login";

    /** Validates unsafe cookie-bearing API requests before the auth pipeline consumes cookies. */
    public async Task InvokeAsync(HttpContext context)
    {
        if (!RequiresAllowedOrigin(context))
        {
            await next(context);
            return;
        }

        var origin = context.Request.Headers.Origin.ToString();
        if (originPolicy.Allows(origin))
        {
            await next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new
        {
            type = "https://httpstatuses.com/403",
            title = "Forbidden",
            status = StatusCodes.Status403Forbidden,
            detail = "Unsafe authenticated API requests require an allowed Origin header."
        });
    }

    /** Cookie-bearing unsafe API requests and every login POST (login-CSRF); login stays CSRF-exempt. */
    private static bool RequiresAllowedOrigin(HttpContext context)
    {
        return UnsafeCookieRequestClassifier.IsUnsafeCookieBearingApiRequest(context)
            || (HttpMethods.IsPost(context.Request.Method)
                && context.Request.Path.Equals(LoginPath, StringComparison.OrdinalIgnoreCase));
    }
}
