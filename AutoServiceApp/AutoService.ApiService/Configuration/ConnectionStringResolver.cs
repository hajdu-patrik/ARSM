namespace AutoService.ApiService.Configuration;

/**
 * Resolves the database connection string, preferring the environment variable
 * 'ConnectionStrings__AutoServiceDb' over appsettings to support Aspire injection
 * and Docker / CI environment overrides without touching committed config files.
 */
public static class ConnectionStringResolver
{
    public static string Resolve(IConfiguration configuration)
    {
        var fromEnvironment = Environment.GetEnvironmentVariable("ConnectionStrings__AutoServiceDb");
        var fromConfiguration = configuration.GetConnectionString("AutoServiceDb");

        var connectionString = string.IsNullOrWhiteSpace(fromEnvironment)
            ? fromConfiguration
            : fromEnvironment;

        if (string.IsNullOrWhiteSpace(connectionString) || connectionString.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Connection string 'AutoServiceDb' is missing. Run through AppHost (Aspire injects it). If you want to run the API project separately, provide a valid connection string in appsettings.Local.json or set the environment variable 'ConnectionStrings__AutoServiceDb'.");
        }

        return connectionString;
    }
}
