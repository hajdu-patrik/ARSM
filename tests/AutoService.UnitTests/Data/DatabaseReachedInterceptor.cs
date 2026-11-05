using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace AutoService.UnitTests.Data;

/** Thrown by the interceptor the moment code first opens a connection: proof it got as far as the database. */
internal sealed class DatabaseReachedException : Exception;

/** Turns the first connection open into a DatabaseReachedException, so no test ever needs a real database. */
internal sealed class DatabaseReachedInterceptor : DbConnectionInterceptor
{
    public override InterceptionResult ConnectionOpening(DbConnection connection, ConnectionEventData eventData, InterceptionResult result)
        => throw new DatabaseReachedException();

    public override ValueTask<InterceptionResult> ConnectionOpeningAsync(
        DbConnection connection, ConnectionEventData eventData, InterceptionResult result, CancellationToken cancellationToken = default)
        => throw new DatabaseReachedException();

    /** True when the action fails with a DatabaseReachedException anywhere in its exception chain. */
    internal static async Task<bool> ReachesDatabaseAsync(Func<Task> action)
    {
        try
        {
            await action();
            return false;
        }
        catch (Exception exception)
        {
            for (Exception? current = exception; current is not null; current = current.InnerException)
            {
                if (current is DatabaseReachedException)
                {
                    return true;
                }
            }

            throw;
        }
    }
}
