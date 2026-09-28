using System.Buffers.Text;
using System.Security.Cryptography;

namespace AutoService.ApiService.Auth.Session;

/**
 * Issues and clears the `autoservice_csrf` double-submit cookie.
 *
 * The cookie carries a random token the WebUI echoes back in the
 * X-CSRF-Token header on unsafe requests (see CsrfDoubleSubmitMiddleware).
 * Unlike the access/refresh cookies it is not HttpOnly, because client script
 * needs to read it, but it otherwise mirrors the refresh-token cookie shape
 * (Path, Secure, SameSite, and the same lifetime), so both always expire
 * together.
 */
internal static class CsrfTokenCookie
{
    private const int TokenByteLength = 32;

    /**
     * Generates a fresh random token and (re)issues the CSRF cookie. Only
     * AuthEndpoints.IssueSessionCookies calls this, in the same response and
     * with the same lifetime as the refresh-token cookie, so the two cookies
     * always stay in sync. The token never appears anywhere but this
     * Set-Cookie header - never in a response body, never logged.
     *
     * @param response Response to append the cookie to.
     * @param ttl Cookie lifetime, matching the refresh-token cookie's MaxAge.
     */
    internal static void Issue(HttpResponse response, TimeSpan ttl)
    {
        var tokenBytes = RandomNumberGenerator.GetBytes(TokenByteLength);
        var token = Base64Url.EncodeToString(tokenBytes);

        response.Cookies.Append(AuthCookieNames.CsrfToken, token, BuildCookieOptions(ttl));
    }

    /**
     * Deletes the CSRF cookie. Only AuthEndpoints.ClearSessionCookies calls
     * this, alongside the `autoservice_at`/`autoservice_rt` deletions.
     *
     * @param response Response to clear the cookie from.
     */
    internal static void Clear(HttpResponse response)
    {
        response.Cookies.Delete(AuthCookieNames.CsrfToken, new CookieOptions { Path = "/" });
    }

    /**
     * Builds the CSRF cookie options: readable by script (HttpOnly=false) so the
     * WebUI can copy its value into the X-CSRF-Token header, otherwise matching
     * the flags the refresh-token cookie uses in the same response.
     *
     * @param ttl Cookie lifetime, mapped to MaxAge.
     * @return Cookie options ready to attach to a response.
     */
    private static CookieOptions BuildCookieOptions(TimeSpan ttl) => new()
    {
        HttpOnly = false,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Path = "/",
        MaxAge = ttl
    };
}
