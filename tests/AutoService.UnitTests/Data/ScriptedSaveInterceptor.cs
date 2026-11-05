using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace AutoService.UnitTests.Data;

/** Fails the save before any database access (or pretends it succeeded), after showing the context to an optional probe. */
internal sealed class ScriptedSaveInterceptor(Exception? failure = null, Action<DbContext>? probe = null) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        probe?.Invoke(eventData.Context!);
        return failure is null ? ValueTask.FromResult(InterceptionResult<int>.SuppressWithResult(1)) : throw failure;
    }
}
