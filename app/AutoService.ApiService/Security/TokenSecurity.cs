using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace AutoService.ApiService.Security;

internal static class TokenSecurity
{
    internal static string HashSha256(string value)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(hashBytes);
    }

    internal static DateTimeOffset? ParseJwtExpiry(ClaimsPrincipal user)
        => ParseUnixSecondsClaim(user, JwtRegisteredClaimNames.Exp);

    internal static DateTimeOffset? ParseJwtIssuedAt(ClaimsPrincipal user)
        => ParseUnixSecondsClaim(user, JwtRegisteredClaimNames.Iat);

    private static DateTimeOffset? ParseUnixSecondsClaim(ClaimsPrincipal user, string claimType)
        => long.TryParse(user.FindFirst(claimType)?.Value, out var unixSeconds)
            ? DateTimeOffset.FromUnixTimeSeconds(unixSeconds)
            : null;
}
