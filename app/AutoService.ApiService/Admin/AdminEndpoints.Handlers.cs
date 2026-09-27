using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Pagination;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Security.Claims;
using System.Data;

namespace AutoService.ApiService.Admin;

public static partial class AdminEndpoints
{
    /**
     * Lists mechanics for the admin console, flagging each row with its
     * Admin-role status and whether it has a stored profile picture.
     *
     * @param limit Optional row cap (1..500, default 500).
     * @param httpContext Current request's HTTP context.
     * @param db Database context.
     * @param loggerFactory Factory used to create the scoped logger.
     * @param cancellationToken Request cancellation token.
     * @returns Mechanic list.
     */
    private static async Task<IResult> ListMechanicsAsync(
        int? limit,
        HttpContext httpContext,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var boundedLimit = ListQueryLimits.Normalize(limit);

        var logger = loggerFactory.CreateLogger("AdminEndpoints.ListMechanics");

        var adminIdentityUserIdSet = (await (
            from userRole in db.UserRoles.AsNoTracking()
            join role in db.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where role.Name == "Admin"
            select userRole.UserId)
            .ToListAsync(cancellationToken))
            .ToHashSet(StringComparer.Ordinal);

        var items = await db.Mechanics
            .AsNoTracking()
            .OrderBy(m => m.Name.LastName)
            .ThenBy(m => m.Name.FirstName)
            .ThenBy(m => m.Id)
            .Take(boundedLimit)
            .Select(m => new MechanicListItemDto(
                m.Id,
                m.Name.FirstName,
                m.Name.MiddleName,
                m.Name.LastName,
                m.Email,
                m.PhoneNumber,
                m.Specialization.ToString(),
                m.IdentityUserId != null && adminIdentityUserIdSet.Contains(m.IdentityUserId),
                m.ProfilePictureObjectKey != null || m.ProfilePictureContentType != null))
            .ToListAsync(cancellationToken);

        logger.LogInformation("Listed mechanics for admin request. Count: {Count}.", items.Count);

        return Results.Ok(items);
    }

    /**
     * Deletes a mechanic and its linked identity account inside a
     * serializable transaction, after rejecting self-deletion, deletion of
     * an admin account, and any deletion-invariant violation.
     *
     * @param id Mechanic identifier to delete.
     * @param httpContext Current request's HTTP context.
     * @param userManager Identity user manager used to remove the linked account.
     * @param db Database context.
     * @param loggerFactory Factory used to create the scoped logger.
     * @param cancellationToken Request cancellation token.
     * @returns 200 on success, or 403/404/409/422/500 on the corresponding failure.
     */
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

    /**
     * Validates that deleting a mechanic would not leave the shop without
     * mechanics or leave an appointment without any assigned mechanic.
     *
     * @param mechanicId Mechanic identifier being deleted.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @returns A 422 problem result when a deletion invariant is violated, otherwise null.
     */
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

    /**
     * Determines whether an exception (or any of its inner exceptions)
     * represents a concurrency conflict raised while deleting a mechanic.
     *
     * @param exception Exception thrown by the deletion transaction.
     * @returns True when the exception chain contains an EF concurrency
     * exception or a Postgres serialization/deadlock error.
     */
    private static bool IsMechanicDeleteConcurrencyConflict(Exception exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
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
