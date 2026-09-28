using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AutoService.ApiService.Data;

/** Design-time DbContext factory for EF Core tools: skips the app host's runtime config (DB/JWT/object-storage secrets)
 * so the offline schema gate needs none; a placeholder connection string suffices since these commands never connect. */
internal sealed class AutoServiceDbContextFactory : IDesignTimeDbContextFactory<AutoServiceDbContext>
{
    /** Placeholder used when no connection string is supplied; never contacted by offline commands. */
    private const string DesignTimeFallbackConnectionString =
        "Host=localhost;Port=5432;Database=AutoServiceDb;Username=design-time;Password=design-time";

    /** Builds a context configured only enough for the EF Core tooling. */
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
