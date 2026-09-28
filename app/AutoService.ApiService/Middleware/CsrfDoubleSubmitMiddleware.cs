using System.Security.Cryptography;
using System.Text;
using AutoService.ApiService.Auth.Session;

namespace AutoService.ApiService.Middleware;

/**
 * Enforces the CSRF double-submit check on unsafe, cookie-authenticated API
 * requests: the X-CSRF-Token header must equal the autoservice_csrf cookie.
 * This is an additional, independent layer alongside SameSite=Strict cookies
 * and the Origin check in UnsafeCookieRequestOriginMiddleware, which this
 * middleware runs directly after. POST /api/auth/login is always exempt,
 * since no autoservice_csrf cookie can exist yet for a caller who is not
 * already authenticated.
 */
public sealed class CsrfDoubleSubmitMiddleware(RequestDelegate next)
{
    private const string LoginPath = "/api/auth/login";

    /** Validates the CSRF header against the CSRF cookie for unsafe cookie-bearing API requests. */
    public async Task InvokeAsync(HttpContext context)
    {
        if (!RequiresCsrfProof(context))
        {
            await next(context);
            return;
        }

        var headerValue = context.Request.Headers[AuthCookieNames.CsrfHeaderName].ToString();
        var cookieValue = context.Request.Cookies[AuthCookieNames.CsrfToken];

        if (IsValidCsrfToken(headerValue, cookieValue))
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
            detail = "Unsafe authenticated API requests require a valid CSRF token.",
            code = "csrf_token_invalid"
        });
    }

    /**
     * True when the request is unsafe, cookie-bearing and API-targeted (per
     * UnsafeCookieRequestClassifier), and is not the login route, which is
     * always exempt from the CSRF check.
     *
     * @param context Current request context.
     * @return Whether the CSRF header/cookie pair must be validated.
     */
    private static bool RequiresCsrfProof(HttpContext context)
    {
        return UnsafeCookieRequestClassifier.IsUnsafeCookieBearingApiRequest(context)
            && !context.Request.Path.Equals(LoginPath, StringComparison.OrdinalIgnoreCase);
    }

    /**
     * Compares the header and cookie values in fixed time over their UTF-8
     * bytes, after rejecting a missing/empty header or cookie outright.
     *
     * @param headerValue Raw X-CSRF-Token header value (empty when absent).
     * @param cookieValue Raw autoservice_csrf cookie value, or null when absent.
     * @return Whether the header proves knowledge of the CSRF cookie value.
     */
    private static bool IsValidCsrfToken(string headerValue, string? cookieValue)
    {
        if (string.IsNullOrEmpty(headerValue) || string.IsNullOrEmpty(cookieValue))
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(headerValue),
            Encoding.UTF8.GetBytes(cookieValue));
    }
}
