using AutoService.ApiService.Data;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Auth.Endpoints;

public static partial class AuthEndpoints
{
    /** A rotated token replayed this soon after its rotation is the same browser's parallel request, not a theft. */
    private static readonly TimeSpan RefreshReuseGrace = TimeSpan.FromSeconds(30);

    /** Handles POST /api/auth/refresh. Validates refresh token state, rotates token, and reissues auth cookies. */
    private static async Task<IResult> RefreshAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        UserManager<IdentityUser> userManager,
        IJwtTokenIssuer tokenIssuer,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AuthEndpoints.Refresh");
        var currentIpAddress = ClientIpAddress.Hash(httpContext);

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
            return await HandleRevokedTokenAsync(existingToken, nowUtc, currentIpAddress, db, logger, cancellationToken);
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

        if (await userManager.IsLockedOutAsync(identityUser))
        {
            logger.LogWarning("Refresh rejected: identity user of mechanic {MechanicId} is locked out.", mechanic.Id);
            return Results.Unauthorized();
        }

        var accessTokenExpiresAtUtc = nowUtc.Add(AccessTokenTtl);
        var refreshTokenExpiresAtUtc = nowUtc.Add(RefreshTokenTtl);

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

        IssueSessionCookies(httpContext.Response, newAccessToken, newRefreshTokenValue);

        var isAdmin = roles.Contains("Admin");
        logger.LogInformation("Refresh succeeded for mechanic {MechanicId}. IsAdmin: {IsAdmin}. ClientIp: {ClientIp}.", mechanic.Id, isAdmin, currentIpAddress);
        return Results.NoContent();
    }

    /** A replay inside the grace window with a live successor is a no-op 204 (the browser already holds the
        successor's cookies); anything else is reuse, which revokes the whole descendant chain. */
    private static async Task<IResult> HandleRevokedTokenAsync(
        RefreshToken revokedToken,
        DateTime nowUtc,
        string? currentIpAddress,
        AutoServiceDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var successorHash = revokedToken.ReplacedByTokenHash;
        if (string.IsNullOrWhiteSpace(successorHash))
        {
            logger.LogWarning("Refresh rejected: token already revoked for mechanic {MechanicId}. ClientIp: {ClientIp}.", revokedToken.MechanicId, currentIpAddress);
            return Results.Unauthorized();
        }

        var withinGrace = nowUtc - revokedToken.RevokedAtUtc!.Value <= RefreshReuseGrace;
        if (withinGrace && await db.RefreshTokens.AnyAsync(x => x.TokenHash == successorHash && x.RevokedAtUtc == null, cancellationToken))
        {
            logger.LogInformation("Refresh replayed within the grace window for mechanic {MechanicId}; nothing rotated.", revokedToken.MechanicId);
            return Results.NoContent();
        }

        logger.LogWarning("Refresh rejected: rotated token reused for mechanic {MechanicId}. ClientIp: {ClientIp}.", revokedToken.MechanicId, currentIpAddress);
        await RevokeRefreshTokenDescendantsAsync(revokedToken, nowUtc, db, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Unauthorized();
    }

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
