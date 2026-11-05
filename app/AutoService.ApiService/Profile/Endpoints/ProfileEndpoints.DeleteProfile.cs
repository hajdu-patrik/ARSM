using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Admin;
using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Storage;
using AutoService.ApiService.Auth.Security;
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
        IProfilePictureStorage storage,
        IAppointmentUpdateBroadcaster broadcaster,
        ILoggerFactory loggerFactory,
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

        var invariantViolation = await AdminEndpoints.ValidateMechanicDeletionInvariantsAsync(person.Id, db, cancellationToken);
        if (invariantViolation is not null)
        {
            return invariantViolation;
        }

        var outcome = await db.ExecuteInTransactionAsync(
            (transaction, token) => DeleteAccountAsync(person.Id, identityUser.Id, userManager, db, transaction, token),
            cancellationToken);

        if (outcome.Failure is not null)
        {
            return outcome.Failure;
        }

        await ProfilePictureObjectCleanup.TryDeleteAsync(
            storage,
            outcome.PictureObjectKey,
            loggerFactory.CreateLogger("ProfileEndpoints.DeleteProfile"));
        broadcaster.PublishAppointmentsChanged(outcome.AppointmentIds);

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

    /** The retriable unit: lock like the admin delete, check the invariants, delete the person (the cascade takes every refresh
        token) and the identity user, commit; a failure rolls back, a success returns the post-commit facts. */
    private static async Task<MechanicDeletionOutcome> DeleteAccountAsync(
        int personId,
        string identityUserId,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        var appointmentIds = await AdminEndpoints.LockMechanicForDeletionAsync(personId, db, cancellationToken);

        var invariantViolation = await AdminEndpoints.ValidateMechanicDeletionInvariantsAsync(personId, db, cancellationToken);
        if (invariantViolation is not null)
        {
            return MechanicDeletionOutcome.Failed(invariantViolation);
        }

        var pictureObjectKey = await db.People
            .Where(p => p.Id == personId)
            .Select(p => p.ProfilePictureObjectKey)
            .FirstOrDefaultAsync(cancellationToken);

        await db.People.Where(p => p.Id == personId).ExecuteDeleteAsync(cancellationToken);

        var identityUser = await userManager.FindByIdAsync(identityUserId);
        if (identityUser is not null)
        {
            var deleteIdentityResult = await userManager.DeleteAsync(identityUser);
            if (!deleteIdentityResult.Succeeded)
            {
                return MechanicDeletionOutcome.Failed(Results.ValidationProblem(deleteIdentityResult.ToValidationErrors()));
            }
        }

        await transaction.CommitAsync(cancellationToken);
        return new MechanicDeletionOutcome(null, appointmentIds, pictureObjectKey);
    }
}
