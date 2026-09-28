using AutoService.ApiService.Auth.Session;

namespace AutoService.ApiService.Middleware;

/** Shared request classification for unsafe, cookie-bearing API requests; used by both the CSRF and
    Origin middlewares so the two independent proof layers agree on which requests to check. */
internal static class UnsafeCookieRequestClassifier
{
    /** True when the request targets the API, uses an unsafe HTTP method, and carries the access-token or refresh-token cookie. */
    internal static bool IsUnsafeCookieBearingApiRequest(HttpContext context)
    {
        return context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase)
            && IsUnsafeMethod(context.Request.Method)
            && HasAuthCookie(context);
    }

    /** True for the HTTP methods that can mutate state (POST/PUT/PATCH/DELETE). */
    internal static bool IsUnsafeMethod(string method)
    {
        return HttpMethods.IsPost(method)
            || HttpMethods.IsPut(method)
            || HttpMethods.IsPatch(method)
            || HttpMethods.IsDelete(method);
    }

    /** True when the request carries the access-token or refresh-token cookie. */
    internal static bool HasAuthCookie(HttpContext context)
    {
        return context.Request.Cookies.ContainsKey(AuthCookieNames.AccessToken)
            || context.Request.Cookies.ContainsKey(AuthCookieNames.RefreshToken);
    }
}
