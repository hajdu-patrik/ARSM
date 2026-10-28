using System.Text;
using AutoService.ApiService.Auth.Endpoints;
using Microsoft.IdentityModel.Tokens;

namespace AutoService.ApiService.Auth.Security;

/** Builds the access-token validation rules; only HS256, the one algorithm JwtTokenIssuer signs with, is accepted. */
internal static class JwtValidationParameters
{
    public static TokenValidationParameters Create(string secret, string issuer, string audience)
    {
        return new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            RequireExpirationTime = true,
            RequireSignedTokens = true,
            ValidateLifetime = true,
            ClockSkew = AuthEndpoints.ClockSkew,
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256]
        };
    }
}
