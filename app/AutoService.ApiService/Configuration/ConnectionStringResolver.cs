namespace AutoService.ApiService.Configuration;

/**
 * Resolves the database connection string, preferring the environment variable
 * 'ConnectionStrings__AutoServiceDb' over appsettings to support Aspire injection
 * and Docker / CI environment overrides without touching committed config files.
 */
public static class ConnectionStringResolver
{
    /**
     * Resolves the AutoServiceDb connection string and rejects template placeholders before startup.
     */
    public static string Resolve(IConfiguration configuration)
    {
        var fromEnvironment = Environment.GetEnvironmentVariable("ConnectionStrings__AutoServiceDb");
        var fromConfiguration = configuration.GetConnectionString("AutoServiceDb");

        var connectionString = string.IsNullOrWhiteSpace(fromEnvironment)
            ? fromConfiguration
            : fromEnvironment;

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'AutoServiceDb' is missing. Run through AppHost (Aspire injects it). If you want to run the API project separately, provide a valid connection string in appsettings.Local.json or set the environment variable 'ConnectionStrings__AutoServiceDb'.");
        }

        if (TemplateMarkerDetector.ContainsTemplateMarker(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'AutoServiceDb' still contains a template placeholder marker (for example CHANGE_ME or SET_UNIQUE_LOCAL). Replace it with real local credentials before startup.");
        }

        return connectionString;
    }
}
