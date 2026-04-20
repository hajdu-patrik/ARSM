using AutoService.ApiService.Data;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Auth.Endpoints;

/**
 * Partial class containing the token-refresh endpoint handler and its supporting helpers.
 */
public static partial class AuthEndpoints
{
    /**
     * Handles POST /api/auth/refresh.
     * Validates refresh token state, rotates token, and reissues auth cookies.
     *
     * @param httpContext Current request context used to read/write cookies.
     * @param db Database context.
     * @param userManager Identity user manager.
     * @param tokenIssuer JWT issuer service.
     * @param loggerFactory Logger factory used to create endpoint logger.
     * @param cancellationToken Request cancellation token.
     * @return 200 OK with refreshed auth payload, or 401 when refresh cannot proceed.
     */
    private static async Task<IResult> RefreshAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        UserManager<IdentityUser> userManager,
        IJwtTokenIssuer tokenIssuer,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AuthEndpoints.Refresh");
        var currentIpAddress = ResolveClientIpAddress(httpContext);

        if (!httpContext.Request.Cookies.TryGetValue(AuthCookieNames.RefreshToken, out var refreshTokenValue) ||
            string.IsNullOrWhiteSpace(refreshTokenValue))
        {
            logger.LogInformation("Refresh rejected: missing or empty refresh token cookie.");
            return Results.Unauthorized();
        }

        var refreshTokenHash = HashRefreshToken(refreshTokenValue);
        var nowUtc = DateTime.UtcNow;

        var existingToken = await db.RefreshTokens
            .Include(x => x.Mechanic)
            .FirstOrDefaultAsync(x => x.TokenHash == refreshTokenHash, cancellationToken);

        if (existingToken is null)
        {
            logger.LogInformation("Refresh rejected: refresh token not found.");
            return Results.Unauthorized();
        }

        if (existingToken.RevokedAtUtc is not null)
        {
            logger.LogWarning("Refresh rejected: token already revoked for mechanic {MechanicId}. ClientIp: {ClientIp}.", existingToken.MechanicId, currentIpAddress);
            if (!string.IsNullOrWhiteSpace(existingToken.ReplacedByTokenHash))
            {
                await RevokeRefreshTokenDescendantsAsync(existingToken, nowUtc, db, cancellationToken);
                await db.SaveChangesAsync(cancellationToken);
            }

            return Results.Unauthorized();
        }

        if (existingToken.ExpiresAtUtc <= nowUtc)
        {
            logger.LogInformation("Refresh rejected: token expired for mechanic {MechanicId}.", existingToken.MechanicId);
            return Results.Unauthorized();
        }

        if (!string.IsNullOrWhiteSpace(existingToken.CreatedByIpAddress) &&
            !string.Equals(existingToken.CreatedByIpAddress, currentIpAddress, StringComparison.Ordinal))
        {
            existingToken.Revoke(nowUtc);
            await db.SaveChangesAsync(cancellationToken);
            logger.LogWarning("Refresh rejected due to IP mismatch for mechanic {MechanicId}; token revoked.", existingToken.MechanicId);
            return Results.Unauthorized();
        }

        var mechanic = existingToken.Mechanic;
        if (string.IsNullOrWhiteSpace(mechanic.IdentityUserId))
        {
            logger.LogWarning("Refresh rejected: mechanic {MechanicId} has no linked identity user.", mechanic.Id);
            return Results.Unauthorized();
        }

        var identityUser = await userManager.FindByIdAsync(mechanic.IdentityUserId);
        if (identityUser is null)
        {
            logger.LogWarning("Refresh rejected: linked identity user missing for mechanic {MechanicId}.", mechanic.Id);
            return Results.Unauthorized();
        }

        var accessTokenTtl = TimeSpan.FromMinutes(10);
        var refreshTokenTtl = TimeSpan.FromDays(7);
        var accessTokenExpiresAtUtc = nowUtc.Add(accessTokenTtl);
        var refreshTokenExpiresAtUtc = nowUtc.Add(refreshTokenTtl);

        var roles = await userManager.GetRolesAsync(identityUser);
        var newAccessToken = tokenIssuer.CreateToken(identityUser, mechanic, roles, accessTokenExpiresAtUtc);
        var newRefreshTokenValue = GenerateRefreshTokenValue();
        var newRefreshTokenHash = HashRefreshToken(newRefreshTokenValue);

        existingToken.Revoke(nowUtc, newRefreshTokenHash);

        db.RefreshTokens.Add(new RefreshToken(
            mechanic.Id,
            newRefreshTokenHash,
            nowUtc,
            refreshTokenExpiresAtUtc,
            currentIpAddress,
            httpContext.Request.Headers.UserAgent.ToString()));

        await db.SaveChangesAsync(cancellationToken);

        httpContext.Response.Cookies.Append(
            AuthCookieNames.AccessToken,
            newAccessToken,
            BuildAccessTokenCookieOptions(accessTokenTtl));

        httpContext.Response.Cookies.Append(
            AuthCookieNames.RefreshToken,
            newRefreshTokenValue,
            BuildRefreshTokenCookieOptions(refreshTokenTtl));

        var isAdmin = roles.Contains("Admin");
        logger.LogInformation("Refresh succeeded for mechanic {MechanicId}. IsAdmin: {IsAdmin}. ClientIp: {ClientIp}.", mechanic.Id, isAdmin, currentIpAddress);
        return Results.Ok(new RefreshResponse(accessTokenExpiresAtUtc, mechanic.Id, PersonTypeResolver.Resolve(mechanic), identityUser.Email ?? mechanic.Email, isAdmin));
    }

    /**
     * Revokes descendant refresh tokens that were issued by token replacement chain.
     *
     * @param rootToken Starting token in rotation chain.
     * @param nowUtc Revocation timestamp.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     */
    private static async Task RevokeRefreshTokenDescendantsAsync(
        RefreshToken rootToken,
        DateTime nowUtc,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var currentToken = rootToken;

        while (!string.IsNullOrWhiteSpace(currentToken.ReplacedByTokenHash))
        {
            var childTokenHash = currentToken.ReplacedByTokenHash;
            var childToken = await db.RefreshTokens
                .FirstOrDefaultAsync(x => x.TokenHash == childTokenHash, cancellationToken);

            if (childToken is null)
            {
                break;
            }

            if (childToken.RevokedAtUtc is null)
            {
                childToken.Revoke(nowUtc);
            }

            currentToken = childToken;
        }
    }
}
