using AutoService.ApiService.Http;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AutoService.ApiService.Data;

internal static class UniqueConstraintDetection
{
    /** True when the exception chain holds a Postgres unique violation (23505). */
    internal static bool IsUniqueConstraintViolation(DbUpdateException exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                return true;
            }
        }

        return false;
    }

    /** Saves; a unique key taken by a parallel request re-runs the check and answers its 409 (else fallbackDetail),
        and an updated row deleted in parallel answers rowGone, the sequential 404, when the caller passes one. */
    internal static async Task<IResult?> SaveOrConflictAsync(
        AutoServiceDbContext db,
        Func<CancellationToken, Task<string?>> findConflict,
        string fallbackDetail,
        CancellationToken cancellationToken,
        IResult? rowGone = null)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return null;
        }
        catch (DbUpdateConcurrencyException) when (rowGone is not null)
        {
            return rowGone;
        }
        catch (DbUpdateException exception) when (IsUniqueConstraintViolation(exception))
        {
            // Drop the failed tracked entities so the re-run lookup reads the database only.
            db.ChangeTracker.Clear();
            return ApiProblem.Conflict(await findConflict(cancellationToken) ?? fallbackDetail);
        }
    }
}
