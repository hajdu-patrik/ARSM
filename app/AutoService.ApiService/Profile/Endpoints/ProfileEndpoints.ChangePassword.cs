using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Data;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
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
        var jwtId = httpContext.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        var tokenExpiresAtUtc = TokenSecurity.ParseJwtExpiry(httpContext.User);

        if (!string.IsNullOrWhiteSpace(jwtId) && tokenExpiresAtUtc.HasValue)
        {
            await tokenDenylistService.RevokeAsync(jwtId, tokenExpiresAtUtc.Value, cancellationToken);
        }

        // Persisted by the unit below; the issuer dates the replacement at the staged cutoff, other devices lose theirs after the commit.
        var cutoffUtc = sessionRevocation.StageCutoff(mechanic);

        var accessTokenExpiresAtUtc = nowUtc.Add(AuthEndpoints.AccessTokenTtl);
        var refreshTokenExpiresAtUtc = nowUtc.Add(AuthEndpoints.RefreshTokenTtl);

        // The unit below persists the cleared flag on its own reloaded entity; this one only feeds the new token's claims.
        mechanic.MustChangePassword = false;
        var roles = await userManager.GetRolesAsync(identityUser);
        var newAccessToken = tokenIssuer.CreateToken(identityUser, mechanic, roles, accessTokenExpiresAtUtc);
        var newRefreshTokenValue = AuthEndpoints.GenerateRefreshTokenValue();
        var newRefreshTokenHash = AuthEndpoints.HashRefreshToken(newRefreshTokenValue);

        var mechanicId = mechanic.Id;
        var clientIpHash = ClientIpAddress.Hash(httpContext);
        var userAgent = httpContext.Request.Headers.UserAgent.ToString();

        await db.ExecuteInTransactionAsync(
            async (transaction, token) =>
            {
                // A fresh entity per attempt, so a retried unit never re-adds the one a failed attempt tracked.
                var replacement = new RefreshToken(mechanicId, newRefreshTokenHash, nowUtc, refreshTokenExpiresAtUtc, clientIpHash, userAgent);
                return await SavePasswordChangeAsync(mechanicId, cutoffUtc, replacement, nowUtc, db, transaction, token);
            },
            cancellationToken,
            // The replacement token commits with the rest of the unit, so its presence proves an ambiguous commit landed.
            verifySucceeded: async token => new ExecutionResult<bool>(
                await db.RefreshTokens.AnyAsync(rt => rt.TokenHash == newRefreshTokenHash, token), true));
        sessionRevocation.ApplyRevocation(mechanicId, cutoffUtc);

        AuthEndpoints.IssueSessionCookies(httpContext.Response, newAccessToken, newRefreshTokenValue);

        return Results.Ok(new { message = "Password changed successfully." });
    }

    /** The retriable unit: clears the forced change, swaps every live refresh token for the replacement and persists
        the monotonic session cutoff, committed together. */
    private static async Task<bool> SavePasswordChangeAsync(
        int mechanicId,
        DateTime cutoffUtc,
        RefreshToken replacement,
        DateTime nowUtc,
        AutoServiceDbContext db,
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        var mechanic = await db.Mechanics.FirstAsync(m => m.Id == mechanicId, cancellationToken);
        mechanic.MustChangePassword = false;

        var activeRefreshTokens = await db.RefreshTokens
            .Where(rt => rt.MechanicId == mechanicId && rt.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var activeRefreshToken in activeRefreshTokens)
        {
            activeRefreshToken.Revoke(nowUtc);
        }

        db.RefreshTokens.Add(replacement);
        await db.SaveWithSessionCutoffAsync(mechanicId, cutoffUtc, cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return true;
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
