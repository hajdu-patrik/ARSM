using AutoService.ApiService.Data;
using AutoService.ApiService.Http;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

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
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AdminEndpoints.ResetMechanicPassword");

        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(request.TemporaryPassword))
        {
            errors["TemporaryPassword"] = ["Temporary password is required."];
        }

        FieldLengthValidator.AddMaxLengthError(errors, "TemporaryPassword", request.TemporaryPassword, FieldLengthValidator.PasswordMaxLength);
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

        mechanic.MustChangePassword = true;
        var nowUtc = DateTime.UtcNow;

        var activeRefreshTokens = await db.RefreshTokens
            .Where(rt => rt.MechanicId == mechanic.Id && rt.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var token in activeRefreshTokens)
        {
            token.Revoke(nowUtc);
        }

        await db.SaveChangesAsync(cancellationToken);
        sessionRevocation.RevokeAll(mechanic.Id);

        logger.LogInformation("Admin {ActorPersonId} set a temporary password for mechanic {MechanicId}; sessions revoked.", actorPersonId, mechanic.Id);
        return Results.NoContent();
    }
}
