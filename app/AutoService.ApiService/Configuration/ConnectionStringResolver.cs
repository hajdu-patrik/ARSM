using System.Text;

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

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'AutoServiceDb' is missing. Run through AppHost (Aspire injects it). If you want to run the API project separately, provide a valid connection string in appsettings.Local.json or set the environment variable 'ConnectionStrings__AutoServiceDb'.");
        }

        if (ContainsTemplateMarker(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'AutoServiceDb' still contains a template placeholder marker (for example CHANGE_ME or SET_UNIQUE_LOCAL). Replace it with real local credentials before startup.");
        }

        return connectionString;
    }

    private static bool ContainsTemplateMarker(string value)
    {
        if (value.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase)
            || value.Contains("SET_UNIQUE_LOCAL", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var normalized = NormalizeForMarkerDetection(value);
        return normalized.Contains("CHANGEME", StringComparison.Ordinal)
            || normalized.Contains("SETUNIQUELOCAL", StringComparison.Ordinal);
    }

    private static string NormalizeForMarkerDetection(string value)
    {
        var builder = new StringBuilder(value.Length);
        foreach (var c in value)
        {
            if (char.IsLetterOrDigit(c))
            {
                builder.Append(char.ToUpperInvariant(c));
            }
        }

        return builder.ToString();
    }
}
