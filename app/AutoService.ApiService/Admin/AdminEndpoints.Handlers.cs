using AutoService.ApiService.Data;
using AutoService.ApiService.Pagination;
using AutoService.ApiService.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;
using System.ComponentModel;
using System.Data;
using AutoService.ApiService.Http;
using AutoService.ApiService.Identity;

namespace AutoService.ApiService.Admin;

public static partial class AdminEndpoints
{
    /** Lists mechanics for the admin console, flagging each row with its Admin-role status and whether it has a stored profile picture. */
    private static async Task<IResult> ListMechanicsAsync(
        [Description("1-based page number; values below 1 become 1. Default 1.")] int? page,
        [Description("Page size, clamped to 1..500. Default 20.")] int? pageSize,
        [Description("Optional case-insensitive substring filter, trimmed, max 100 characters.")] string? search,
        HttpContext httpContext,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var request = ListQueryLimits.NormalizePage(page, pageSize);

        var logger = loggerFactory.CreateLogger("AdminEndpoints.ListMechanics");

        var adminIdentityUserIdSet = (await (
            from userRole in db.UserRoles.AsNoTracking()
            join role in db.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where role.Name == "Admin"
            select userRole.UserId)
            .ToListAsync(cancellationToken))
            .ToHashSet(StringComparer.Ordinal);

        var query = db.Mechanics.AsNoTracking();
        var term = SearchTerm.Normalize(search);
        if (term is not null)
        {
            query = query.Where(m =>
                m.Name.FirstName.ToUpper().Contains(term) ||
                (m.Name.MiddleName != null && m.Name.MiddleName.ToUpper().Contains(term)) ||
                m.Name.LastName.ToUpper().Contains(term) ||
                (m.Name.FirstName + " " + m.Name.LastName).ToUpper().Contains(term) ||
                m.Email.ToUpper().Contains(term) ||
                (m.PhoneNumber != null && m.PhoneNumber.ToUpper().Contains(term)) ||
                m.Specialization.ToString().ToUpper().Contains(term));
        }

        var ordered = query.OrderBy(m => m.Name.LastName)
            .ThenBy(m => m.Name.FirstName)
            .ThenBy(m => m.Id);

        var result = await ordered
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
            .ToPagedResultAsync(request, cancellationToken);

        logger.LogInformation("Listed mechanics for admin request. Count: {Count}.", result.Items.Count);

        return Results.Ok(result);
    }

    /** Deletes a mechanic and its linked identity account inside a serializable transaction, after rejecting self-deletion,
        deletion of an admin account, and any deletion-invariant violation; the deleted mechanic's sessions end at once. */
    private static async Task<IResult> DeleteMechanicAsync(
        int id,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        ISessionRevocationService sessionRevocation,
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

        IResult? failure;
        try
        {
            failure = await db.ExecuteInTransactionAsync(
                (transaction, token) => DeleteMechanicRecordsAsync(id, userManager, db, transaction, logger, token),
                cancellationToken,
                IsolationLevel.Serializable);
        }
        catch (Exception ex) when (IsMechanicDeleteConcurrencyConflict(ex))
        {
            logger.LogWarning("DeleteMechanic concurrency conflict for mechanic {MechanicId}.", id);
            return ApiProblem.Conflict("Mechanic deletion conflicted with another concurrent update. Please retry the operation.");
        }

        if (failure is not null)
        {
            return failure;
        }

        sessionRevocation.RevokeAll(id);
        logger.LogInformation("DeleteMechanic succeeded for mechanic {MechanicId} by admin {ActorPersonId}.", id, callerPid);

        return Results.Ok(new { message = "Mechanic deleted successfully." });
    }

    /** The retriable unit: invariants, refresh tokens, identity user, mechanic row, commit; a non-null result rolls back. */
    private static async Task<IResult?> DeleteMechanicRecordsAsync(
        int id,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        IDbContextTransaction transaction,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var mechanicToDelete = await db.Mechanics.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (mechanicToDelete is null)
        {
            return ApiProblem.NotFound("Mechanic not found.");
        }

        var invariantViolation = await ValidateMechanicDeletionInvariantsAsync(mechanicToDelete.Id, db, cancellationToken);
        if (invariantViolation is not null)
        {
            logger.LogWarning("DeleteMechanic blocked by deletion invariants for mechanic {MechanicId}.", mechanicToDelete.Id);
            return invariantViolation;
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
                    return Results.Problem(
                        detail: "Failed to delete linked identity account.",
                        statusCode: StatusCodes.Status500InternalServerError);
                }
            }
        }

        db.Mechanics.Remove(mechanicToDelete);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return null;
    }

    /** Validates that deleting a mechanic would not leave the shop without mechanics or leave an appointment without any assigned mechanic. */
    private static async Task<IResult?> ValidateMechanicDeletionInvariantsAsync(
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
