using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Domain;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace AutoService.ApiService.Auth.Endpoints;

public static partial class AuthEndpoints
{
    private static readonly Lock AccessTokenTtlLock = new();
    private static bool isAccessTokenTtlConfigured;

    /**
     * Access-token lifetime, used for both the JWT exp claim and the access-token cookie
     * MaxAge. Starts at a 10-minute fallback and is set once at startup through
     * ConfigureAccessTokenTtl from the resolved 'JwtSettings:ExpirationMinutes' value.
     */
    internal static TimeSpan AccessTokenTtl { get; private set; } = TimeSpan.FromMinutes(10);

    internal static readonly TimeSpan RefreshTokenTtl = TimeSpan.FromDays(7);

    /**
     * Sets the access-token lifetime from configuration. The composition root calls it once,
     * before any request is served; a second call fails fast so no code path can change the
     * lifetime at runtime.
     *
     * @param expirationMinutes Positive access-token lifetime in minutes.
     */
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
    /**
     * Converts an Identity error result into the RFC 7807 validation problem format
     * used by Results.ValidationProblem().
     *
     * @param identityResult A failed IdentityResult from UserManager.
     * @return A dictionary keyed by error code with arrays of error descriptions.
     */
    private static Dictionary<string, string[]> ToValidationErrors(IdentityResult identityResult)
    {
        return identityResult.Errors
            .GroupBy(x => string.IsNullOrWhiteSpace(x.Code) ? "identity" : x.Code)
            .ToDictionary(group => group.Key, group => group.Select(x => x.Description).ToArray());
    }

    /**
     * Returns null for blank/whitespace-only strings, or the trimmed value otherwise.
     * Used to normalise optional fields such as middle name and phone number.
     *
     * @param value Raw string from the request.
     * @return Trimmed string, or null.
     */
    private static string? NormalizeOptional(string? value)
        => ContactNormalization.NormalizeOptional(value);

    /**
     * Appends a "field is required" error entry if the value is null or whitespace.
     *
     * @param errors The working error dictionary to append to.
     * @param key The field name used as the error key.
     * @param value The field value to check.
     */
    private static void AddRequired(Dictionary<string, string[]> errors, string key, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[key] = [$"{key} is required."];
        }
    }

    private static bool TryNormalizeEmail(string? rawValue, out string normalizedEmail)
        => ContactNormalization.TryNormalizeEmail(rawValue, out normalizedEmail);

    /**
     * Generates a cryptographically random refresh-token value.
     *
     * @return A base64-encoded 64-byte random token.
     */
    internal static string GenerateRefreshTokenValue()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    internal static string HashRefreshToken(string token)
        => TokenSecurity.HashSha256(token);

    /**
     * Builds the shared HttpOnly/Secure/Strict cookie options used for both the
     * access-token and refresh-token cookies.
     *
     * @param ttl Cookie lifetime, mapped to MaxAge.
     * @return Cookie options ready to attach to a response.
     */
    private static CookieOptions BuildAuthCookieOptions(TimeSpan ttl) => new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        IsEssential = true,
        Path = "/",
        MaxAge = ttl
    };

    private static CookieOptions BuildAccessTokenCookieOptions(TimeSpan ttl) => BuildAuthCookieOptions(ttl);

    private static CookieOptions BuildRefreshTokenCookieOptions(TimeSpan ttl) => BuildAuthCookieOptions(ttl);

    /**
     * Issues the complete session cookie set - access token, refresh token and the CSRF
     * double-submit token - from one place, so no handler can rotate the auth cookies
     * without rotating the CSRF cookie alongside them with the refresh cookie's lifetime.
     * Login, refresh and change-password all go through here.
     *
     * @param response Response to append the cookies to.
     * @param accessToken Signed JWT for the access-token cookie.
     * @param refreshTokenValue Raw (unhashed) refresh-token value for the refresh-token cookie.
     */
    internal static void IssueSessionCookies(HttpResponse response, string accessToken, string refreshTokenValue)
    {
        response.Cookies.Append(AuthCookieNames.AccessToken, accessToken, BuildAccessTokenCookieOptions(AccessTokenTtl));
        response.Cookies.Append(AuthCookieNames.RefreshToken, refreshTokenValue, BuildRefreshTokenCookieOptions(RefreshTokenTtl));
        CsrfTokenCookie.Issue(response, RefreshTokenTtl);
    }

    /**
     * Clears the complete session cookie set; the counterpart of IssueSessionCookies.
     * Logout and profile deletion both go through here.
     *
     * @param response Response to clear the cookies from.
     */
    internal static void ClearSessionCookies(HttpResponse response)
    {
        response.Cookies.Delete(AuthCookieNames.AccessToken, new CookieOptions { Path = "/" });
        response.Cookies.Delete(AuthCookieNames.RefreshToken, new CookieOptions { Path = "/" });
        CsrfTokenCookie.Clear(response);
    }

    private static DateTimeOffset? ParseTokenExpiry(ClaimsPrincipal user)
        => TokenSecurity.ParseJwtExpiry(user);

    /**
     * Resolves a privacy-preserving identifier for the caller's IP address by hashing
     * it with SHA-256, so raw client IPs never appear in logs.
     *
     * @param httpContext The current request's HTTP context.
     * @return A truncated "sha256:" prefixed hash, or null when no remote IP is available.
     */
    internal static string? ResolveClientIpAddress(HttpContext httpContext)
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString();
        if (string.IsNullOrWhiteSpace(ip)) return null;
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(ip));
        return $"sha256:{Convert.ToHexString(hash)[..12]}";
    }
}