using System.Text;

namespace AutoService.ApiService.Configuration;

/**
 * Resolves the JWT signing secret, preferring the environment variable
 * 'JwtSettings__Secret' over appsettings. Throws at startup if the secret is
 * missing, set to a placeholder, or shorter than 32 bytes (HMAC-SHA256 minimum).
 */
public static class JwtSettingsResolver
{
    public static string ResolveSecret(IConfiguration configuration)
    {
        var fromEnvironment = Environment.GetEnvironmentVariable("JwtSettings__Secret");
        var fromConfiguration = configuration["JwtSettings:Secret"];

        var secret = string.IsNullOrWhiteSpace(fromEnvironment)
            ? fromConfiguration
            : fromEnvironment;

        if (string.IsNullOrWhiteSpace(secret))
        {
            throw new InvalidOperationException(
                "JWT secret 'JwtSettings:Secret' is missing. Provide a strong secret in appsettings.Local.json, user secrets, or the 'JwtSettings__Secret' environment variable.");
        }

        if (TemplateMarkerDetector.ContainsTemplateMarker(secret))
        {
            throw new InvalidOperationException(
                "JWT secret 'JwtSettings:Secret' still contains a template placeholder marker (for example CHANGE_ME or SET_UNIQUE_LOCAL). Replace it with a unique local secret before startup.");
        }

        if (Encoding.UTF8.GetByteCount(secret) < 32)
        {
            throw new InvalidOperationException(
                "JWT secret 'JwtSettings:Secret' must be at least 32 bytes long.");
        }

        return secret;
    }
}
