/**
 * TokenSecurity.cs
 *
 * Auto-generated documentation header for this source file.
 */

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace AutoService.ApiService.Security;

/**
 * Backend type for API logic in this file.
 */
internal static class TokenSecurity
{
        internal static string HashSha256(string value)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(hashBytes);
    }

        internal static DateTimeOffset? ParseJwtExpiry(ClaimsPrincipal user)
    {
        var expClaim = user.FindFirst(JwtRegisteredClaimNames.Exp)?.Value;
        if (!long.TryParse(expClaim, out var expUnix))
        {
            return null;
        }

        return DateTimeOffset.FromUnixTimeSeconds(expUnix);
    }
}
