using System.IdentityModel.Tokens.Jwt;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Auth.Endpoints;

public static partial class AuthEndpoints
{
    /** Handles POST /api/auth/logout. Revokes active refresh token session, deny-lists current access token JTI, and clears authentication cookies. */
    private static async Task<IResult> LogoutAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        ITokenDenylistService tokenDenylistService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AuthEndpoints.Logout");

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
                logger.LogInformation("Logout revoked active refresh token for mechanic {MechanicId}.", refreshToken.MechanicId);
            }
        }

        var jwtId = httpContext.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        var tokenExpiresAtUtc = ParseTokenExpiry(httpContext.User);

        if (!string.IsNullOrWhiteSpace(jwtId) && tokenExpiresAtUtc.HasValue)
        {
            await tokenDenylistService.RevokeAsync(jwtId, tokenExpiresAtUtc.Value, cancellationToken);
            logger.LogInformation("Logout added current access token JTI to denylist.");
        }

        ClearSessionCookies(httpContext.Response);

        logger.LogInformation("Logout completed and auth cookies cleared.");

        return Results.NoContent();
    }
}
