using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Data;
using AutoService.ApiService.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System.IdentityModel.Tokens.Jwt;
using AutoService.ApiService.Http;
using AutoService.ApiService.Identity;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    /** Handles the delete-profile mutation: verifies the current password (lockout-counted), rejects administrator accounts,
        removes the person and the identity user in one transaction, revokes every session and clears the auth cookies. */
    private static async Task<IResult> DeleteProfileAsync(
        [FromBody] DeleteProfileRequest request,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        SignInManager<IdentityUser> signInManager,
        AutoServiceDbContext db,
        ITokenDenylistService tokenDenylistService,
        ISessionRevocationService sessionRevocation,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["CurrentPassword"] = ["Current password is required."]
            });
        }

        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken, trackChanges: false);
        if (person?.IdentityUserId is null)
        {
            return ApiProblem.NotFound("Linked identity account not found.");
        }

        var identityUser = await userManager.FindByIdAsync(person.IdentityUserId);
        if (identityUser is null)
        {
            return ApiProblem.NotFound("Identity account not found.");
        }

        var isAdmin = await userManager.IsInRoleAsync(identityUser, "Admin");
        if (isAdmin)
        {
            return ApiProblem.Forbidden("Administrator accounts cannot be deleted.");
        }

        var (passwordAccepted, lockoutResult) = await PasswordCheck.VerifyAsync(signInManager, userManager, identityUser, request.CurrentPassword);
        if (lockoutResult is not null)
        {
            return lockoutResult;
        }

        if (!passwordAccepted)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["CurrentPassword"] = ["Current password is invalid."]
            });
        }

        var deleteResult = await db.ExecuteInTransactionAsync(
            (transaction, token) => DeleteAccountAsync(person.Id, identityUser.Id, httpContext, userManager, db, transaction, token),
            cancellationToken);

        if (deleteResult is not null)
        {
            return deleteResult;
        }

        var jwtId = httpContext.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        var tokenExpiresAtUtc = TokenSecurity.ParseJwtExpiry(httpContext.User);

        if (!string.IsNullOrWhiteSpace(jwtId) && tokenExpiresAtUtc.HasValue)
        {
            await tokenDenylistService.RevokeAsync(jwtId, tokenExpiresAtUtc.Value, cancellationToken);
        }

        sessionRevocation.RevokeAll(person.Id);
        AuthEndpoints.ClearSessionCookies(httpContext.Response);

        return Results.Ok(new { message = "Profile deleted successfully." });
    }

    /** The retriable unit: revoke the active refresh token, delete the person and the identity user, commit; null means done. */
    private static async Task<IResult?> DeleteAccountAsync(
        int personId,
        string identityUserId,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        if (httpContext.Request.Cookies.TryGetValue(AuthCookieNames.RefreshToken, out var refreshTokenValue) &&
            !string.IsNullOrWhiteSpace(refreshTokenValue))
        {
            var refreshTokenHash = TokenSecurity.HashSha256(refreshTokenValue);
            var refreshToken = await db.RefreshTokens
                .FirstOrDefaultAsync(x => x.TokenHash == refreshTokenHash, cancellationToken);

            if (refreshToken is not null && refreshToken.RevokedAtUtc is null)
            {
                refreshToken.Revoke(DateTime.UtcNow);
            }
        }

        await db.People.Where(p => p.Id == personId).ExecuteDeleteAsync(cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        var identityUser = await userManager.FindByIdAsync(identityUserId);
        if (identityUser is not null)
        {
            var deleteIdentityResult = await userManager.DeleteAsync(identityUser);
            if (!deleteIdentityResult.Succeeded)
            {
                return Results.ValidationProblem(deleteIdentityResult.ToValidationErrors());
            }
        }

        await transaction.CommitAsync(cancellationToken);
        return null;
    }
}
