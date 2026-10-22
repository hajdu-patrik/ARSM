using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Security;
using System.Security.Cryptography;

namespace AutoService.ApiService.Auth.Endpoints;

public static partial class AuthEndpoints
{
    private static readonly Lock AccessTokenTtlLock = new();
    private static bool isAccessTokenTtlConfigured;

    /** Access-token lifetime (JWT exp claim and cookie MaxAge); set once at startup from 'JwtSettings:ExpirationMinutes' through ConfigureAccessTokenTtl. */
    internal static TimeSpan AccessTokenTtl { get; private set; } = TimeSpan.FromMinutes(10);

    internal static readonly TimeSpan RefreshTokenTtl = TimeSpan.FromDays(7);

    /** Tolerance the bearer validation allows on exp and nbf; the session cutoffs keep their entries that much longer. */
    internal static readonly TimeSpan ClockSkew = TimeSpan.FromSeconds(30);

    /** Called once by the composition root before any request is served; a second call fails fast. */
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

    private static void AddRequired(Dictionary<string, string[]> errors, string key, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[key] = [$"{key} is required."];
        }
    }

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
}
