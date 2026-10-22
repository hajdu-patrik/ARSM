using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AutoService.ApiService.Data;

/** Design-time factory for the EF tools: it needs no runtime config, so the offline schema gate runs without secrets (a placeholder connection string suffices, nothing connects). */
internal sealed class AutoServiceDbContextFactory : IDesignTimeDbContextFactory<AutoServiceDbContext>
{
    /** Placeholder used when no connection string is supplied; never contacted by offline commands. */
    private const string DesignTimeFallbackConnectionString =
        "Host=localhost;Port=5432;Database=AutoServiceDb;Username=design-time;Password=design-time";

    public AutoServiceDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__AutoServiceDb");

        var options = new DbContextOptionsBuilder<AutoServiceDbContext>()
            .UseNpgsql(string.IsNullOrWhiteSpace(connectionString)
                ? DesignTimeFallbackConnectionString
                : connectionString)
            .Options;

        return new AutoServiceDbContext(options);
    }
}
