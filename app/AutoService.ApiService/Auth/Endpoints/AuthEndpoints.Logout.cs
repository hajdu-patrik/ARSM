using System.IdentityModel.Tokens.Jwt;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Security;

namespace AutoService.ApiService.Auth.Endpoints;

public static partial class AuthEndpoints
{
    /** Handles POST /api/auth/logout: revokes the refresh session, deny-lists the access JTI and clears the cookies.
        A valid access token or an active refresh token is enough; with neither the answer is 401. */
    private static async Task<IResult> LogoutAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        ITokenDenylistService tokenDenylistService,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AuthEndpoints.Logout");

        var nowUtc = DateTime.UtcNow;
        var isAuthenticated = httpContext.User.Identity?.IsAuthenticated == true;
        var revokedRefreshSession = false;

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
                revokedRefreshSession = true;
                logger.LogInformation("Logout revoked active refresh token for mechanic {MechanicId}.", refreshToken.MechanicId);
            }
        }

        if (!isAuthenticated && !revokedRefreshSession)
        {
            return Results.Unauthorized();
        }

        var jwtId = httpContext.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        var tokenExpiresAtUtc = TokenSecurity.ParseJwtExpiry(httpContext.User);

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
