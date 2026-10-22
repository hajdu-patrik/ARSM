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
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted)
        => db.Database.CreateExecutionStrategy().ExecuteAsync(
            async token =>
            {
                db.ChangeTracker.Clear();
                await using var transaction = await db.Database.BeginTransactionAsync(isolationLevel, token);
                return await operation(transaction, token);
            },
            cancellationToken);
}
