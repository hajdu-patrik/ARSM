using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Configuration;

namespace AutoService.ApiService.Middleware;

/** Blocks browser-style unsafe API requests with auth cookies unless Origin matches the configured WebUI. */
public sealed class UnsafeCookieRequestOriginMiddleware(RequestDelegate next, WebUiOriginPolicy originPolicy)
{
    /** Validates unsafe cookie-bearing API requests before the auth pipeline consumes cookies. */
    public async Task InvokeAsync(HttpContext context)
    {
        if (!RequiresOriginProof(context))
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

    private static bool RequiresOriginProof(HttpContext context)
    {
        return context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase)
            && IsUnsafeMethod(context.Request.Method)
            && HasAuthCookie(context);
    }

    private static bool IsUnsafeMethod(string method)
    {
        return HttpMethods.IsPost(method)
            || HttpMethods.IsPut(method)
            || HttpMethods.IsPatch(method)
            || HttpMethods.IsDelete(method);
    }

    private static bool HasAuthCookie(HttpContext context)
    {
        return context.Request.Cookies.ContainsKey(AuthCookieNames.AccessToken)
            || context.Request.Cookies.ContainsKey(AuthCookieNames.RefreshToken);
    }
}