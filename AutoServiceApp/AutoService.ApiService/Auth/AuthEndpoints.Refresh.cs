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
        IConfiguration configuration,
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

        if (existingToken is null || !existingToken.IsActive(nowUtc))
        {
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

        var newAccessToken = await CreateJwtTokenAsync(identityUser, mechanic, userManager, configuration, accessTokenExpiresAtUtc);
        var newRefreshTokenValue = GenerateRefreshTokenValue();
        var newRefreshTokenHash = HashRefreshToken(newRefreshTokenValue);

        existingToken.Revoke(nowUtc, newRefreshTokenHash);

        db.RefreshTokens.Add(new RefreshToken(
            mechanic.Id,
            newRefreshTokenHash,
            nowUtc,
            refreshTokenExpiresAtUtc,
            httpContext.Connection.RemoteIpAddress?.ToString(),
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

        var isAdmin = (await userManager.GetRolesAsync(identityUser)).Contains("Admin");
        return Results.Ok(new RefreshResponse(accessTokenExpiresAtUtc, mechanic.Id, GetPersonType(mechanic), identityUser.Email ?? mechanic.Email, isAdmin));
    }
}
