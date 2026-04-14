/**
 * AdminEndpoints.Handlers.cs
 *
 * Auto-generated documentation header for this source file.
 */

using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Security.Claims;
using System.Data;

namespace AutoService.ApiService.Admin;

/**
 * Backend type for API logic in this file.
 */
public static partial class AdminEndpoints
{
        private static async Task<IResult> ListMechanicsAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AdminEndpoints.ListMechanics");

        var mechanics = await db.Mechanics
            .AsNoTracking()
            .OrderBy(m => m.Name.LastName)
            .ThenBy(m => m.Name.FirstName)
            .ToListAsync(cancellationToken);

        var adminIdentityUserIdSet = (await (
            from userRole in db.UserRoles.AsNoTracking()
            join role in db.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where role.Name == "Admin"
            select userRole.UserId)
            .ToListAsync(cancellationToken))
            .ToHashSet(StringComparer.Ordinal);

        var items = new List<MechanicListItem>(mechanics.Count);

        foreach (var mechanic in mechanics)
        {
            var isAdmin = mechanic.IdentityUserId is not null && adminIdentityUserIdSet.Contains(mechanic.IdentityUserId);
            var hasProfilePicture = mechanic.ProfilePicture is not null && mechanic.ProfilePictureContentType is not null;

            items.Add(new MechanicListItem(
                mechanic.Id,
                mechanic.Name.FirstName,
                mechanic.Name.MiddleName,
                mechanic.Name.LastName,
                mechanic.Email,
                mechanic.PhoneNumber,
                mechanic.Specialization.ToString(),
                isAdmin,
                hasProfilePicture));
        }

            logger.LogInformation("Listed mechanics for admin request. Count: {Count}.", items.Count);

        return Results.Ok(items);
    }

        private static async Task<IResult> DeleteMechanicAsync(
        int id,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AdminEndpoints.DeleteMechanic");

        var callerPersonId = httpContext.User.FindFirst("person_id")?.Value;
        if (int.TryParse(callerPersonId, out var callerPid) && callerPid == id)
        {
            logger.LogWarning("DeleteMechanic forbidden: admin attempted self-deletion for person {PersonId}.", id);
            return Results.Problem(
                detail: "Administrators cannot delete their own account.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var mechanic = await db.Mechanics
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (mechanic is null)
        {
            logger.LogInformation("DeleteMechanic failed: mechanic {MechanicId} not found.", id);
            return Results.Problem(
                detail: "Mechanic not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        if (mechanic.IdentityUserId is not null)
        {
            var identityUser = await userManager.FindByIdAsync(mechanic.IdentityUserId);
            if (identityUser is not null)
            {
                var isTargetAdmin = await userManager.IsInRoleAsync(identityUser, "Admin");
                if (isTargetAdmin)
                {
                    logger.LogWarning("DeleteMechanic forbidden: target mechanic {MechanicId} has Admin role.", id);
                    return Results.Problem(
                        detail: "Cannot delete an administrator account.",
                        statusCode: StatusCodes.Status403Forbidden);
                }
            }
        }

        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

            var mechanicToDelete = await db.Mechanics.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
            if (mechanicToDelete is null)
            {
                return Results.Problem(
                    detail: "Mechanic not found.",
                    statusCode: StatusCodes.Status404NotFound);
            }

            var invariantViolation = await ValidateMechanicDeletionInvariantsAsync(mechanicToDelete.Id, db, cancellationToken);
            if (invariantViolation is not null)
            {
                logger.LogWarning("DeleteMechanic blocked by deletion invariants for mechanic {MechanicId}.", mechanicToDelete.Id);
                return invariantViolation;
            }

            // Revoke all refresh tokens for this mechanic.
            var refreshTokens = await db.RefreshTokens
                .Where(rt => rt.MechanicId == mechanicToDelete.Id && rt.RevokedAtUtc == null)
                .ToListAsync(cancellationToken);

            var nowUtc = DateTime.UtcNow;
            foreach (var token in refreshTokens)
            {
                token.Revoke(nowUtc);
            }

            if (mechanicToDelete.IdentityUserId is not null)
            {
                var identityUser = await userManager.FindByIdAsync(mechanicToDelete.IdentityUserId);
                if (identityUser is not null)
                {
                    var identityDeleteResult = await userManager.DeleteAsync(identityUser);
                    if (!identityDeleteResult.Succeeded)
                    {
                        await transaction.RollbackAsync(cancellationToken);
                        logger.LogWarning("DeleteMechanic failed while deleting linked identity user for mechanic {MechanicId}.", mechanicToDelete.Id);
                        return Results.Problem(
                            detail: "Failed to delete linked identity account.",
                            statusCode: StatusCodes.Status500InternalServerError);
                    }
                }
            }

            db.Mechanics.Remove(mechanicToDelete);
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            logger.LogInformation("DeleteMechanic succeeded for mechanic {MechanicId}.", mechanicToDelete.Id);
        }
        catch (Exception ex) when (IsMechanicDeleteConcurrencyConflict(ex))
        {
            logger.LogWarning("DeleteMechanic concurrency conflict for mechanic {MechanicId}.", id);
            return Results.Problem(
                detail: "Mechanic deletion conflicted with another concurrent update. Please retry the operation.",
                statusCode: StatusCodes.Status409Conflict);
        }

        return Results.Ok(new { message = "Mechanic deleted successfully." });
    }

        private static async Task<IResult?> ValidateMechanicDeletionInvariantsAsync(
        int mechanicId,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var mechanicCount = await db.Mechanics.CountAsync(cancellationToken);
        if (mechanicCount <= 1)
        {
            return Results.Problem(
                detail: "Cannot delete the last remaining mechanic.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var wouldLeaveUnassignedAppointment = await db.Appointments
            .Where(a => a.Mechanics.Any(m => m.Id == mechanicId))
            .AnyAsync(a => a.Mechanics.Count == 1, cancellationToken);

        if (wouldLeaveUnassignedAppointment)
        {
            return Results.Problem(
                detail: "Cannot delete this mechanic because one or more appointments would be left without assigned mechanics.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        return null;
    }

        private static bool IsMechanicDeleteConcurrencyConflict(Exception exception)
    {
        for (var current = exception; current is not null; current = current.InnerException!)
        {
            if (current is DbUpdateConcurrencyException)
            {
                return true;
            }

            if (current is PostgresException postgresException
                && (postgresException.SqlState == PostgresErrorCodes.SerializationFailure
                    || postgresException.SqlState == PostgresErrorCodes.DeadlockDetected))
            {
                return true;
            }
        }

        return false;
    }
}
