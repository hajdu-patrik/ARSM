using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace AutoService.UnitTests.Data;

/** Stands in for the retry unit of ExecuteInTransactionAsync: records the token it got, then answers a canned result or fails; EF's own query runs pass through. */
internal sealed class ScriptedExecutionStrategy(object? result = null, Exception? failure = null) : IExecutionStrategy
{
    public int Runs { get; private set; }

    public CancellationToken Token { get; private set; }

    public bool RetriesOnFailure => false;

    public TResult Execute<TState, TResult>(
        TState state, Func<DbContext, TState, TResult> operation, Func<DbContext, TState, ExecutionResult<TResult>>? verifySucceeded)
        => throw new NotSupportedException();

    public Task<TResult> ExecuteAsync<TState, TResult>(
        TState state,
        Func<DbContext, TState, CancellationToken, Task<TResult>> operation,
        Func<DbContext, TState, CancellationToken, Task<ExecutionResult<TResult>>>? verifySucceeded,
        CancellationToken cancellationToken = default)
    {
        if (state is not Func<IDbContextTransaction, CancellationToken, Task<TResult>>)
        {
            return operation(null!, state, cancellationToken);
        }

        Runs++;
        Token = cancellationToken;
        return failure is null ? Task.FromResult((TResult)result!) : Task.FromException<TResult>(failure);
    }
}
