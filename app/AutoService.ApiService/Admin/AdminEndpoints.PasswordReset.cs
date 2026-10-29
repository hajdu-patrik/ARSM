using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Email;
using AutoService.ApiService.Email.Sending;
using AutoService.ApiService.Http;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace AutoService.ApiService.Admin;

public static partial class AdminEndpoints
{
    /** Sets a temporary password on another non-admin mechanic, ends every session the mechanic holds and forces a
        change at the next login; the actor is logged. Admins change their own password in Settings. */
    private static async Task<IResult> ResetMechanicPasswordAsync(
        int id,
        ResetMechanicPasswordRequest request,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        ISessionRevocationService sessionRevocation,
        IEmailSender emailSender,
        EmailSettings emailSettings,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AdminEndpoints.ResetMechanicPassword");

        var errors = ValidateTemporaryPassword(request.TemporaryPassword);
        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        var actorPersonId = httpContext.User.GetPersonIdOrDefault();
        if (actorPersonId == id)
        {
            return ApiProblem.Forbidden("Administrators cannot reset their own password.");
        }

        var mechanic = await db.Mechanics.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        var identityUser = mechanic?.IdentityUserId is null ? null : await userManager.FindByIdAsync(mechanic.IdentityUserId);
        if (mechanic is null || identityUser is null)
        {
            return ApiProblem.NotFound("Mechanic not found.");
        }

        if (await userManager.IsInRoleAsync(identityUser, "Admin"))
        {
            return ApiProblem.Forbidden("Cannot reset an administrator's password.");
        }

        var resetToken = await userManager.GeneratePasswordResetTokenAsync(identityUser);
        var resetResult = await userManager.ResetPasswordAsync(identityUser, resetToken, request.TemporaryPassword);
        if (!resetResult.Succeeded)
        {
            return Results.ValidationProblem(resetResult.ToValidationErrors(fallbackKey: "TemporaryPassword"));
        }

        var cutoffUtc = sessionRevocation.StageCutoff(mechanic);
        await db.ExecuteInTransactionAsync(
            (transaction, token) => SaveResetRevocationAsync(mechanic.Id, cutoffUtc, db, transaction, token),
            cancellationToken);
        sessionRevocation.ApplyRevocation(mechanic.Id, cutoffUtc);

        logger.LogInformation("Admin {ActorPersonId} set a temporary password for mechanic {MechanicId}; sessions revoked.", actorPersonId, mechanic.Id);

        // The reset is never rolled back on a mail failure (user decision 2026-10-23); the admin hands the password over.
        var emailSent = await TrySendTemporaryPasswordAsync(
            mechanic, request.TemporaryPassword, emailSender, emailSettings, db, logger, cancellationToken);
        return Results.Ok(new ResetMechanicPasswordResponse(emailSent, mechanic.Email));
    }

    /** Collects the required and maximum-length errors of the temporary password. */
    private static Dictionary<string, string[]> ValidateTemporaryPassword(string? temporaryPassword)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(temporaryPassword))
        {
            errors["TemporaryPassword"] = ["Temporary password is required."];
        }

        FieldLengthValidator.AddMaxLengthError(errors, "TemporaryPassword", temporaryPassword, FieldLengthValidator.PasswordMaxLength);
        return errors;
    }

    /** The retriable unit: forced change flag, refresh-token revocation and the monotonic session cutoff, committed together. */
    private static async Task<bool> SaveResetRevocationAsync(
        int mechanicId,
        DateTime cutoffUtc,
        AutoServiceDbContext db,
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        var mechanic = await db.Mechanics.FirstAsync(m => m.Id == mechanicId, cancellationToken);
        mechanic.MustChangePassword = true;
        await RevokeActiveRefreshTokensAsync(db, mechanicId, cancellationToken);
        await db.SaveWithSessionCutoffAsync(mechanicId, cutoffUtc, cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    /** Marks every live refresh token of the mechanic revoked; the caller saves. */
    private static async Task RevokeActiveRefreshTokensAsync(
        AutoServiceDbContext db, int mechanicId, CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;
        var activeRefreshTokens = await db.RefreshTokens
            .Where(rt => rt.MechanicId == mechanicId && rt.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var token in activeRefreshTokens)
        {
            token.Revoke(nowUtc);
        }
    }

    /** Mails the temporary password; false when the company profile is missing or the mail failed. */
    private static async Task<bool> TrySendTemporaryPasswordAsync(
        Mechanic mechanic,
        string temporaryPassword,
        IEmailSender emailSender,
        EmailSettings emailSettings,
        AutoServiceDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var row = await db.CompanyProfiles.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        if (row is null)
        {
            logger.LogWarning("Temporary password e-mail skipped: the company profile row is missing.");
            return false;
        }

        var mailer = new PasswordResetMailer(emailSender, emailSettings, logger);
        return await mailer.SendAsync(
            mechanic.Email, mechanic.Name.ToString(), temporaryPassword, row.ToProfile(), cancellationToken);
    }
}
