using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Data;
using AutoService.ApiService.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    /** Handles the delete-profile mutation: verifies the current password, rejects administrator accounts, revokes the active refresh token, removes the person record and the linked identity user in a single transaction, and clears the auth cookies. */
    private static async Task<IResult> DeleteProfileAsync(
        [FromBody] DeleteProfileRequest request,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        ITokenDenylistService tokenDenylistService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["CurrentPassword"] = ["Current password is required."]
            });
        }

        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken);
        if (person?.IdentityUserId is null)
        {
            return Results.Problem(
                detail: "Linked identity account not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var identityUser = await userManager.FindByIdAsync(person.IdentityUserId);
        if (identityUser is null)
        {
            return Results.Problem(
                detail: "Identity account not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var isAdmin = await userManager.IsInRoleAsync(identityUser, "Admin");
        if (isAdmin)
        {
            return Results.Problem(
                detail: "Administrator accounts cannot be deleted.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var validPassword = await userManager.CheckPasswordAsync(identityUser, request.CurrentPassword);
        if (!validPassword)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["CurrentPassword"] = ["Current password is invalid."]
            });
        }

        var nowUtc = DateTime.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        if (httpContext.Request.Cookies.TryGetValue(AuthCookieNames.RefreshToken, out var refreshTokenValue) &&
            !string.IsNullOrWhiteSpace(refreshTokenValue))
        {
            var refreshTokenHash = TokenSecurity.HashSha256(refreshTokenValue);
            var refreshToken = await db.RefreshTokens
                .FirstOrDefaultAsync(x => x.TokenHash == refreshTokenHash, cancellationToken);

            if (refreshToken is not null && refreshToken.RevokedAtUtc is null)
            {
                refreshToken.Revoke(nowUtc);
                await db.SaveChangesAsync(cancellationToken);
            }
        }

        db.People.Remove(person);
        await db.SaveChangesAsync(cancellationToken);

        var deleteIdentityResult = await userManager.DeleteAsync(identityUser);
        if (!deleteIdentityResult.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);

            var identityErrors = deleteIdentityResult.Errors
                .GroupBy(e => string.IsNullOrWhiteSpace(e.Code) ? "identity" : e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());

            return Results.ValidationProblem(identityErrors);
        }

        var jwtId = httpContext.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        var tokenExpiresAtUtc = TokenSecurity.ParseJwtExpiry(httpContext.User);

        if (!string.IsNullOrWhiteSpace(jwtId) && tokenExpiresAtUtc.HasValue)
        {
            await tokenDenylistService.RevokeAsync(jwtId, tokenExpiresAtUtc.Value, cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        AuthEndpoints.ClearSessionCookies(httpContext.Response);

        return Results.Ok(new { message = "Profile deleted successfully." });
    }
}
