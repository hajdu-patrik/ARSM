using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace AutoService.ApiService.Data;

/** Runs a handler's explicit transaction as one retriable unit of the Npgsql retrying execution strategy. */
internal static class TransactionalExecution
{
    /** The operation loads what it writes inside the transaction (the tracker is cleared first) and commits itself;
        returning without a commit rolls back, and a transient failure re-runs the whole unit. */
    internal static Task<TResult> ExecuteInTransactionAsync<TResult>(
        this AutoServiceDbContext db,
        Func<IDbContextTransaction, CancellationToken, Task<TResult>> operation,
        CancellationToken cancellationToken,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        Func<CancellationToken, Task<ExecutionResult<TResult>>>? verifySucceeded = null)
        => db.Database.CreateExecutionStrategy().ExecuteAsync(
            operation,
            async (_, unit, token) =>
            {
                db.ChangeTracker.Clear();
                await using var transaction = await db.Database.BeginTransactionAsync(isolationLevel, token);
                return await unit(transaction, token);
            },
            // Before a retry, lets the caller detect a unit whose commit reached the server although the call failed.
            verifySucceeded is null ? null : (_, _, token) => verifySucceeded(token),
            cancellationToken);
}
