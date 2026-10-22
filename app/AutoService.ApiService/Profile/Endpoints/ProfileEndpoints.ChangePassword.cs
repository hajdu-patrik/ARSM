using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Data;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using AutoService.ApiService.Http;
using AutoService.ApiService.Identity;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    /** Handles the change-password mutation: validates the new password pair, verifies the current password (lockout-counted),
        revokes every other session of the caller, clears a pending forced change and issues a fresh token pair. */
    private static async Task<IResult> ChangePasswordAsync(
        ChangePasswordRequest request,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        SignInManager<IdentityUser> signInManager,
        AutoServiceDbContext db,
        IJwtTokenIssuer tokenIssuer,
        ITokenDenylistService tokenDenylistService,
        ISessionRevocationService sessionRevocation,
        CancellationToken cancellationToken)
    {
        var errors = ValidateChangePasswordRequest(request);
        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        // Resolved before the password changes, so a missing mechanic record can never leave the
        // caller with a changed password but no replacement session.
        var mechanic = await db.Mechanics
            .FirstOrDefaultAsync(x => x.Id == httpContext.User.GetPersonIdOrDefault(), cancellationToken);
        var identityUser = mechanic?.IdentityUserId is null ? null : await userManager.FindByIdAsync(mechanic.IdentityUserId);

        if (mechanic is null || identityUser is null)
        {
            return ApiProblem.NotFound("Linked mechanic record not found.");
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

        var changeResult = await userManager.ChangePasswordAsync(identityUser, request.CurrentPassword, request.NewPassword);
        if (!changeResult.Succeeded)
        {
            return Results.ValidationProblem(changeResult.ToValidationErrors(fallbackKey: "password"));
        }

        var nowUtc = DateTime.UtcNow;
        mechanic.MustChangePassword = false;

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

        // Every other device loses its access token now; the issuer dates the replacement at the new cutoff.
        sessionRevocation.RevokeAll(mechanic.Id);

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
            ClientIpAddress.Hash(httpContext),
            httpContext.Request.Headers.UserAgent.ToString()));

        await db.SaveChangesAsync(cancellationToken);

        AuthEndpoints.IssueSessionCookies(httpContext.Response, newAccessToken, newRefreshTokenValue);

        return Results.Ok(new { message = "Password changed successfully." });
    }

    /** Presence, confirmation and length rules of the three password fields, before any hashing work runs. */
    private static Dictionary<string, string[]> ValidateChangePasswordRequest(ChangePasswordRequest request)
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

        return errors;
    }
}
