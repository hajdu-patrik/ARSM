using AutoService.ApiService.Auth.Session;

namespace AutoService.ApiService.Middleware;

/**
 * Shared request classification for unsafe (state-changing) API requests that
 * carry an auth cookie. Used by both UnsafeCookieRequestOriginMiddleware and
 * CsrfDoubleSubmitMiddleware so the two independent proof layers - Origin and
 * CSRF double-submit - agree on exactly which requests need to be checked.
 */
internal static class UnsafeCookieRequestClassifier
{
    /**
     * True when the request targets the API, uses an unsafe HTTP method, and
     * carries the access-token or refresh-token cookie.
     *
     * @param context Current request context.
     * @return Whether the request needs Origin/CSRF proof.
     */
    internal static bool IsUnsafeCookieBearingApiRequest(HttpContext context)
    {
        return context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase)
            && IsUnsafeMethod(context.Request.Method)
            && HasAuthCookie(context);
    }

    /**
     * True for the HTTP methods that can mutate state (POST/PUT/PATCH/DELETE).
     *
     * @param method Request HTTP method.
     * @return Whether the method is considered unsafe.
     */
    internal static bool IsUnsafeMethod(string method)
    {
        return HttpMethods.IsPost(method)
            || HttpMethods.IsPut(method)
            || HttpMethods.IsPatch(method)
            || HttpMethods.IsDelete(method);
    }

    /**
     * True when the request carries the access-token or refresh-token cookie.
     *
     * @param context Current request context.
     * @return Whether either auth cookie is present.
     */
    internal static bool HasAuthCookie(HttpContext context)
    {
        return context.Request.Cookies.ContainsKey(AuthCookieNames.AccessToken)
            || context.Request.Cookies.ContainsKey(AuthCookieNames.RefreshToken);
    }
}
