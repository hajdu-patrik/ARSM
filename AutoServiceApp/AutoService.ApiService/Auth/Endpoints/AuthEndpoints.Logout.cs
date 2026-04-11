using System.IdentityModel.Tokens.Jwt;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Auth.Endpoints;

public static partial class AuthEndpoints
{
    /**
     * Handles POST /api/auth/logout.
     * Revokes refresh token session, denylists current JWT jti, and clears auth cookies.
     */
    private static async Task<IResult> LogoutAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        ITokenDenylistService tokenDenylistService,
        CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;

        if (httpContext.Request.Cookies.TryGetValue(AuthCookieNames.RefreshToken, out var refreshTokenValue) &&
            !string.IsNullOrWhiteSpace(refreshTokenValue))
        {
            var refreshTokenHash = HashRefreshToken(refreshTokenValue);
            var refreshToken = await db.RefreshTokens
                .FirstOrDefaultAsync(x => x.TokenHash == refreshTokenHash, cancellationToken);

            if (refreshToken is not null && refreshToken.RevokedAtUtc is null)
            {
                refreshToken.Revoke(nowUtc);
                await db.SaveChangesAsync(cancellationToken);
            }
        }

        var jwtId = httpContext.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        var tokenExpiresAtUtc = ParseTokenExpiry(httpContext.User);

        if (!string.IsNullOrWhiteSpace(jwtId) && tokenExpiresAtUtc.HasValue)
        {
            await tokenDenylistService.RevokeAsync(jwtId, tokenExpiresAtUtc.Value, cancellationToken);
        }

        httpContext.Response.Cookies.Delete(AuthCookieNames.AccessToken, new CookieOptions { Path = "/" });
        httpContext.Response.Cookies.Delete(AuthCookieNames.RefreshToken, new CookieOptions { Path = "/" });

        return Results.NoContent();
    }
}
