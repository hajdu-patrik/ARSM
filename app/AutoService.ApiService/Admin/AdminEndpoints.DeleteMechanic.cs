using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Data;
using AutoService.ApiService.Http;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Security;
using AutoService.ApiService.Storage;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;

namespace AutoService.ApiService.Admin;

/** What a finished mechanic-deletion unit hands back: a failure to answer, or the facts the caller acts on after the commit. */
internal sealed record MechanicDeletionOutcome(IResult? Failure, IReadOnlyList<int> AppointmentIds, string? PictureObjectKey)
{
    internal static MechanicDeletionOutcome Failed(IResult failure) => new(failure, [], null);
}

public static partial class AdminEndpoints
{
    /** Serializes every mechanic deletion (admin and self), so the last-mechanic count never interleaves. */
    private const long MechanicDeletionLockKey = 0x4152534D44454C31;

    /** Deletes a mechanic and its linked identity account in one locked transaction, after rejecting self-deletion,
        deletion of an admin account, and any deletion-invariant violation; picture, sessions and live update follow the commit. */
    private static async Task<IResult> DeleteMechanicAsync(
        int id,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        ISessionRevocationService sessionRevocation,
        IProfilePictureStorage storage,
        IAppointmentUpdateBroadcaster broadcaster,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AdminEndpoints.DeleteMechanic");

        if (httpContext.User.TryGetPersonId(out var callerPid) && callerPid == id)
        {
            logger.LogWarning("DeleteMechanic forbidden: admin attempted self-deletion for person {PersonId}.", id);
            return ApiProblem.Forbidden("Administrators cannot delete their own account.");
        }

        var mechanic = await db.Mechanics
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (mechanic is null)
        {
            logger.LogInformation("DeleteMechanic failed: mechanic {MechanicId} not found.", id);
            return ApiProblem.NotFound("Mechanic not found.");
        }

        if (mechanic.IdentityUserId is not null)
        {
            var identityUser = await userManager.FindByIdAsync(mechanic.IdentityUserId);
            if (identityUser is not null && await userManager.IsInRoleAsync(identityUser, "Admin"))
            {
                logger.LogWarning("DeleteMechanic forbidden: target mechanic {MechanicId} has Admin role.", id);
                return ApiProblem.Forbidden("Cannot delete an administrator account.");
            }
        }

        MechanicDeletionOutcome outcome;
        try
        {
            outcome = await db.ExecuteInTransactionAsync(
                (transaction, token) => DeleteMechanicRecordsAsync(id, userManager, db, transaction, logger, token),
                cancellationToken);
        }
        catch (Exception ex) when (IsMechanicDeleteConcurrencyConflict(ex))
        {
            logger.LogWarning("DeleteMechanic concurrency conflict for mechanic {MechanicId}.", id);
            return ApiProblem.Conflict("Mechanic deletion conflicted with another concurrent update. Please retry the operation.");
        }

        if (outcome.Failure is not null)
        {
            return outcome.Failure;
        }

        await ProfilePictureObjectCleanup.TryDeleteAsync(storage, outcome.PictureObjectKey, logger);
        broadcaster.PublishAppointmentsChanged(outcome.AppointmentIds);
        sessionRevocation.RevokeAll(id);
        logger.LogInformation("DeleteMechanic succeeded for mechanic {MechanicId} by admin {ActorPersonId}.", id, callerPid);

        return Results.Ok(new { message = "Mechanic deleted successfully." });
    }

    /** The retriable unit: locks, invariants, refresh tokens, identity user, mechanic row, commit; a failure rolls back. */
    private static async Task<MechanicDeletionOutcome> DeleteMechanicRecordsAsync(
        int id,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        IDbContextTransaction transaction,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var appointmentIds = await LockMechanicForDeletionAsync(id, db, cancellationToken);

        var mechanicToDelete = await db.Mechanics.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (mechanicToDelete is null)
        {
            return MechanicDeletionOutcome.Failed(ApiProblem.NotFound("Mechanic not found."));
        }

        var invariantViolation = await ValidateMechanicDeletionInvariantsAsync(mechanicToDelete.Id, db, cancellationToken);
        if (invariantViolation is not null)
        {
            logger.LogWarning("DeleteMechanic blocked by deletion invariants for mechanic {MechanicId}.", mechanicToDelete.Id);
            return MechanicDeletionOutcome.Failed(invariantViolation);
        }

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
                    logger.LogWarning("DeleteMechanic failed while deleting linked identity user for mechanic {MechanicId}.", mechanicToDelete.Id);
                    return MechanicDeletionOutcome.Failed(Results.Problem(
                        detail: "Failed to delete linked identity account.",
                        statusCode: StatusCodes.Status500InternalServerError));
                }
            }
        }

        var pictureObjectKey = mechanicToDelete.ProfilePictureObjectKey;
        db.Mechanics.Remove(mechanicToDelete);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new MechanicDeletionOutcome(null, appointmentIds, pictureObjectKey);
    }

    /** Takes the deletion lock, the mechanic's person row and its appointment rows (ids ascending) and returns those ids;
        run inside the unit before the invariant check, which then reads rows no unassign or claim can change. */
    internal static async Task<IReadOnlyList<int>> LockMechanicForDeletionAsync(
        int mechanicId,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({MechanicDeletionLockKey})", cancellationToken);

        // FOR UPDATE conflicts with the KEY SHARE lock a join-row insert (claim, assign) holds on the person row.
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"""SELECT 1 FROM people WHERE "Id" = {mechanicId} FOR UPDATE""",
            cancellationToken);

        var appointmentIds = await db.Appointments
            .Where(a => a.Mechanics.Any(m => m.Id == mechanicId))
            .OrderBy(a => a.Id)
            .Select(a => a.Id)
            .ToArrayAsync(cancellationToken);

        if (appointmentIds.Length > 0)
        {
            await db.Database.ExecuteSqlInterpolatedAsync(
                $"""SELECT 1 FROM appointments WHERE "Id" = ANY({appointmentIds}) ORDER BY "Id" FOR UPDATE""",
                cancellationToken);
        }

        return appointmentIds;
    }

    /** Validates that deleting a mechanic would not leave the shop without mechanics or leave an appointment without any assigned mechanic. */
    internal static async Task<IResult?> ValidateMechanicDeletionInvariantsAsync(
        int mechanicId,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var mechanicCount = await db.Mechanics.CountAsync(cancellationToken);
        if (mechanicCount <= 1)
        {
            return ApiProblem.Unprocessable("Cannot delete the last remaining mechanic.");
        }

        var wouldLeaveUnassignedAppointment = await db.Appointments
            .Where(a => a.Mechanics.Any(m => m.Id == mechanicId))
            .AnyAsync(a => a.Mechanics.Count == 1, cancellationToken);

        if (wouldLeaveUnassignedAppointment)
        {
            return ApiProblem.Unprocessable("Cannot delete this mechanic because one or more appointments would be left without assigned mechanics.");
        }

        return null;
    }

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
