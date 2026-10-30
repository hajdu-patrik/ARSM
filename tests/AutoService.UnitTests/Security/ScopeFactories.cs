using Microsoft.Extensions.DependencyInjection;

namespace AutoService.UnitTests.Security;

/** A scope factory that counts and refuses every scope, proving a code path never reaches the database. */
internal sealed class ThrowingScopeFactory(Exception exception) : IServiceScopeFactory
{
    private int created;

    public int Created => Volatile.Read(ref created);

    public IServiceScope CreateScope()
    {
        Interlocked.Increment(ref created);
        throw exception;
    }
}
