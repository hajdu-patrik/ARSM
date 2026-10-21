using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Security;
using System.Security.Cryptography;
using System.Text;

namespace AutoService.ApiService.Auth.Endpoints;

public static partial class AuthEndpoints
{
    private static readonly Lock AccessTokenTtlLock = new();
    private static bool isAccessTokenTtlConfigured;

    /** Access-token lifetime, used for both the JWT exp claim and the access-token cookie MaxAge. Starts at a 10-minute fallback and is set once at startup through ConfigureAccessTokenTtl from the resolved 'JwtSettings:ExpirationMinutes' value. */
    internal static TimeSpan AccessTokenTtl { get; private set; } = TimeSpan.FromMinutes(10);

    internal static readonly TimeSpan RefreshTokenTtl = TimeSpan.FromDays(7);

    /** Sets the access-token lifetime from configuration. The composition root calls it once, before any request is served; a second call fails fast so no code path can change the lifetime at runtime. */
    internal static void ConfigureAccessTokenTtl(int expirationMinutes)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(expirationMinutes);

        lock (AccessTokenTtlLock)
        {
            if (isAccessTokenTtlConfigured)
            {
                throw new InvalidOperationException("The access-token lifetime is already configured.");
            }

            AccessTokenTtl = TimeSpan.FromMinutes(expirationMinutes);
            isAccessTokenTtlConfigured = true;
        }
    }

    /** Appends a "field is required" error entry if the value is null or whitespace. */
    private static void AddRequired(Dictionary<string, string[]> errors, string key, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[key] = [$"{key} is required."];
        }
    }

    /** Generates a cryptographically random refresh-token value. */
    internal static string GenerateRefreshTokenValue()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    internal static string HashRefreshToken(string token)
        => TokenSecurity.HashSha256(token);

    /** Builds the shared HttpOnly/Secure/Strict cookie options used for both the access-token and refresh-token cookies;
        Secure, Path=/ and no Domain are what the __Host- cookie prefix requires, so none of them may change. */
    private static CookieOptions BuildAuthCookieOptions(TimeSpan ttl) => new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        IsEssential = true,
        Path = "/",
        MaxAge = ttl
    };

    /** Builds the options that expire a __Host- session cookie: browsers ignore the expiry unless it repeats
        Secure and Path=/ (no Domain), and SameSite matches the issued cookie. */
    private static CookieOptions BuildAuthCookieDeletionOptions() => new()
    {
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Path = "/"
    };

    /** Issues the full session cookie set (access, refresh, CSRF) from one place, so no handler can
        rotate auth cookies without keeping the CSRF cookie in sync; used by login, refresh, change-password. */
    internal static void IssueSessionCookies(HttpResponse response, string accessToken, string refreshTokenValue)
    {
        response.Cookies.Append(AuthCookieNames.AccessToken, accessToken, BuildAuthCookieOptions(AccessTokenTtl));
        response.Cookies.Append(AuthCookieNames.RefreshToken, refreshTokenValue, BuildAuthCookieOptions(RefreshTokenTtl));
        CsrfTokenCookie.Issue(response, RefreshTokenTtl);
    }

    /** Clears the complete session cookie set; the counterpart of IssueSessionCookies. Logout and profile deletion both go through here. */
    internal static void ClearSessionCookies(HttpResponse response)
    {
        response.Cookies.Delete(AuthCookieNames.AccessToken, BuildAuthCookieDeletionOptions());
        response.Cookies.Delete(AuthCookieNames.RefreshToken, BuildAuthCookieDeletionOptions());
        CsrfTokenCookie.Clear(response);
    }

    /** Resolves a privacy-preserving identifier for the caller's IP address by hashing it with SHA-256, so raw client IPs never appear in logs. */
    internal static string? ResolveClientIpAddress(HttpContext httpContext)
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString();
        if (string.IsNullOrWhiteSpace(ip)) return null;
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(ip));
        return $"sha256:{Convert.ToHexString(hash)[..12]}";
    }
}