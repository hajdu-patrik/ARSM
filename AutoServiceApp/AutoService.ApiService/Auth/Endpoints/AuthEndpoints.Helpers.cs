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

    private static string GenerateRefreshTokenValue()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    private static string HashRefreshToken(string token)
        => TokenSecurity.HashSha256(token);

    private static CookieOptions BuildAccessTokenCookieOptions(TimeSpan ttl)
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            IsEssential = true,
            Path = "/",
            MaxAge = ttl
        };
    }

    private static CookieOptions BuildRefreshTokenCookieOptions(TimeSpan ttl)
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            IsEssential = true,
            Path = "/",
            MaxAge = ttl
        };
    }

    private static DateTimeOffset? ParseTokenExpiry(ClaimsPrincipal user)
        => TokenSecurity.ParseJwtExpiry(user);

    private static string? ResolveClientIpAddress(HttpContext httpContext)
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString();
        return string.IsNullOrWhiteSpace(ip) ? null : ip;
    }
}