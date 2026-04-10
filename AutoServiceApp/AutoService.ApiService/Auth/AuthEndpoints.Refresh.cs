using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Auth;

public static partial class AuthEndpoints
{
    /**
     * Handles POST /api/auth/refresh.
     * Validates refresh token cookie, rotates refresh token, and reissues access token cookie.
     */
    private static async Task<IResult> RefreshAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        UserManager<IdentityUser> userManager,
        IJwtTokenIssuer tokenIssuer,
        CancellationToken cancellationToken)
    {
        if (!httpContext.Request.Cookies.TryGetValue(AuthCookieNames.RefreshToken, out var refreshTokenValue) ||
            string.IsNullOrWhiteSpace(refreshTokenValue))
        {
            return Results.Unauthorized();
        }

        var refreshTokenHash = HashRefreshToken(refreshTokenValue);
        var nowUtc = DateTime.UtcNow;

        var existingToken = await db.RefreshTokens
            .Include(x => x.Mechanic)
            .FirstOrDefaultAsync(x => x.TokenHash == refreshTokenHash, cancellationToken);

        if (existingToken is null)
        {
            return Results.Unauthorized();
        }

        if (existingToken.RevokedAtUtc is not null)
        {
            if (!string.IsNullOrWhiteSpace(existingToken.ReplacedByTokenHash))
            {
                await RevokeRefreshTokenDescendantsAsync(existingToken, nowUtc, db, cancellationToken);
                await db.SaveChangesAsync(cancellationToken);
            }

            return Results.Unauthorized();
        }

        if (existingToken.ExpiresAtUtc <= nowUtc)
        {
            return Results.Unauthorized();
        }

        var currentIpAddress = ResolveClientIpAddress(httpContext);
        if (!string.IsNullOrWhiteSpace(existingToken.CreatedByIpAddress) &&
            !string.Equals(existingToken.CreatedByIpAddress, currentIpAddress, StringComparison.Ordinal))
        {
            existingToken.Revoke(nowUtc);
            await db.SaveChangesAsync(cancellationToken);
            return Results.Unauthorized();
        }

        var mechanic = existingToken.Mechanic;
        if (string.IsNullOrWhiteSpace(mechanic.IdentityUserId))
        {
            return Results.Unauthorized();
        }

        var identityUser = await userManager.FindByIdAsync(mechanic.IdentityUserId);
        if (identityUser is null)
        {
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
        return Results.Ok(new RefreshResponse(accessTokenExpiresAtUtc, mechanic.Id, GetPersonType(mechanic), identityUser.Email ?? mechanic.Email, isAdmin));
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
