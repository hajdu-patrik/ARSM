using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Data;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    /** Handles the change-password mutation: validates the new password pair, verifies the current password, revokes the caller's existing refresh tokens and access token, and issues a fresh token pair. */
    private static async Task<IResult> ChangePasswordAsync(
        ChangePasswordRequest request,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        IJwtTokenIssuer tokenIssuer,
        ITokenDenylistService tokenDenylistService,
        CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            errors["CurrentPassword"] = ["Current password is required."];
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            errors["NewPassword"] = ["New password is required."];
        }

        if (string.IsNullOrWhiteSpace(request.ConfirmNewPassword))
        {
            errors["ConfirmNewPassword"] = ["Password confirmation is required."];
        }

        if (!string.IsNullOrWhiteSpace(request.NewPassword) &&
            !string.IsNullOrWhiteSpace(request.ConfirmNewPassword) &&
            !string.Equals(request.NewPassword, request.ConfirmNewPassword, StringComparison.Ordinal))
        {
            errors["ConfirmNewPassword"] = ["Passwords do not match."];
        }

        FieldLengthValidator.AddMaxLengthError(errors, "CurrentPassword", request.CurrentPassword, FieldLengthValidator.PasswordMaxLength);
        FieldLengthValidator.AddMaxLengthError(errors, "NewPassword", request.NewPassword, FieldLengthValidator.PasswordMaxLength);
        FieldLengthValidator.AddMaxLengthError(errors, "ConfirmNewPassword", request.ConfirmNewPassword, FieldLengthValidator.PasswordMaxLength);

        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
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

        // Resolved before the password changes, so a missing mechanic record can never leave the
        // caller with a changed password but no replacement session.
        var mechanic = await db.Mechanics
            .FirstOrDefaultAsync(x => x.IdentityUserId == identityUser.Id, cancellationToken);

        if (mechanic is null)
        {
            return Results.Problem(
                detail: "Linked mechanic record not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var changeResult = await userManager.ChangePasswordAsync(
            identityUser,
            request.CurrentPassword,
            request.NewPassword);

        if (!changeResult.Succeeded)
        {
            var identityErrors = changeResult.Errors
                .GroupBy(e => string.IsNullOrWhiteSpace(e.Code) ? "password" : e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());

            if (identityErrors.Remove("PasswordMismatch", out var mismatchMessages))
            {
                identityErrors["CurrentPassword"] = mismatchMessages;
            }

            return Results.ValidationProblem(identityErrors);
        }

        var nowUtc = DateTime.UtcNow;

        var activeRefreshTokens = await db.RefreshTokens
            .Where(rt => rt.MechanicId == mechanic.Id && rt.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var activeRefreshToken in activeRefreshTokens)
        {
            activeRefreshToken.Revoke(nowUtc);
        }

        var jwtId = httpContext.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        var tokenExpiresAtUtc = TokenSecurity.ParseJwtExpiry(httpContext.User);

        if (!string.IsNullOrWhiteSpace(jwtId) && tokenExpiresAtUtc.HasValue)
        {
            await tokenDenylistService.RevokeAsync(jwtId, tokenExpiresAtUtc.Value, cancellationToken);
        }

        var accessTokenExpiresAtUtc = nowUtc.Add(AuthEndpoints.AccessTokenTtl);
        var refreshTokenExpiresAtUtc = nowUtc.Add(AuthEndpoints.RefreshTokenTtl);

        var roles = await userManager.GetRolesAsync(identityUser);
        var newAccessToken = tokenIssuer.CreateToken(identityUser, mechanic, roles, accessTokenExpiresAtUtc);
        var newRefreshTokenValue = AuthEndpoints.GenerateRefreshTokenValue();
        var newRefreshTokenHash = AuthEndpoints.HashRefreshToken(newRefreshTokenValue);

        db.RefreshTokens.Add(new RefreshToken(
            mechanic.Id,
            newRefreshTokenHash,
            nowUtc,
            refreshTokenExpiresAtUtc,
            AuthEndpoints.ResolveClientIpAddress(httpContext),
            httpContext.Request.Headers.UserAgent.ToString()));

        await db.SaveChangesAsync(cancellationToken);

        AuthEndpoints.IssueSessionCookies(httpContext.Response, newAccessToken, newRefreshTokenValue);

        return Results.Ok(new { message = "Password changed successfully." });
    }
}
