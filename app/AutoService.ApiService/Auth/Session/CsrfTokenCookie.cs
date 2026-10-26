using System.Buffers.Text;
using System.Security.Cryptography;

namespace AutoService.ApiService.Auth.Session;

/** Issues/clears the `__Host-arsm-csrf-token` double-submit cookie (HttpOnly=false so script can read it);
    mirrors the refresh-token cookie's shape and lifetime so both expire together (see ApiService/CLAUDE.md). */
internal static class CsrfTokenCookie
{
    private const int TokenByteLength = 32;

    /** Generates a fresh token and (re)issues the CSRF cookie; only IssueSessionCookies calls this, so
        it always rotates alongside the refresh cookie. The token appears only in this Set-Cookie header. */
    internal static void Issue(HttpResponse response, TimeSpan ttl)
    {
        var tokenBytes = RandomNumberGenerator.GetBytes(TokenByteLength);
        var token = Base64Url.EncodeToString(tokenBytes);

        response.Cookies.Append(AuthCookieNames.CsrfToken, token, BuildCookieOptions(ttl));
    }

    /** Deletes the CSRF cookie; the __Host- prefix needs Secure and Path=/ on the deletion too. */
    internal static void Clear(HttpResponse response)
    {
        response.Cookies.Delete(AuthCookieNames.CsrfToken, new CookieOptions
        {
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/"
        });
    }

    /** Cookie options: script-readable (HttpOnly=false), otherwise the same flags as the refresh cookie. */
    private static CookieOptions BuildCookieOptions(TimeSpan ttl) => new()
    {
        HttpOnly = false,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Path = "/",
        MaxAge = ttl
    };
}
