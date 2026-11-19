using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Storage;

namespace AutoService.UnitTests.Data;

/** A context on the Npgsql provider that is never opened: enough to build the model and run SaveChanges validation. */
internal static class TestDbContextFactory
{
    public static AutoServiceDbContext Create(params IInterceptor[] interceptors)
    {
        var options = new DbContextOptionsBuilder<AutoServiceDbContext>()
            .UseNpgsql("Host=localhost;Database=unit-test;Username=unit-test");
        options.AddInterceptors(interceptors);

        return new AutoServiceDbContext(options.Options);
    }

    /** The same context, but ExecuteInTransactionAsync runs the scripted strategy instead of a real transaction. */
    public static AutoServiceDbContext CreateWithStrategy(IExecutionStrategy strategy, params IInterceptor[] interceptors)
    {
        var options = new DbContextOptionsBuilder<AutoServiceDbContext>()
            .UseNpgsql("Host=localhost;Database=unit-test;Username=unit-test", npgsql => npgsql.ExecutionStrategy(_ => strategy));
        options.AddInterceptors(interceptors);

        return new AutoServiceDbContext(options.Options);
    }
}
