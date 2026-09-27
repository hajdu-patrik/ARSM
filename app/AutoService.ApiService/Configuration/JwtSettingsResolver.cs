using System.Globalization;
using System.Text;

namespace AutoService.ApiService.Configuration;

/**
 * Resolves the JWT signing secret, preferring the environment variable
 * 'JwtSettings__Secret' over appsettings. Throws at startup if the secret is
 * missing, set to a placeholder, or shorter than 32 bytes (HMAC-SHA256 minimum).
 */
public static class JwtSettingsResolver
{
    private const int DefaultExpirationMinutes = 10;

    /**
     * Resolves the JWT signing secret, preferring the 'JwtSettings__Secret' environment
     * variable over the 'JwtSettings:Secret' configuration key.
     *
     * @param configuration The application configuration to read from.
     * @return The validated JWT signing secret.
     */
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

    /**
     * Resolves the JWT access-token lifetime in minutes from 'JwtSettings:ExpirationMinutes'.
     * Defaults to 10 minutes when the key is missing or blank. Throws at startup if the
     * key is present but is not a positive integer.
     */
    public static int ResolveExpirationMinutes(IConfiguration configuration)
    {
        var rawValue = configuration["JwtSettings:ExpirationMinutes"];

        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return DefaultExpirationMinutes;
        }

        if (!int.TryParse(rawValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var expirationMinutes)
            || expirationMinutes <= 0)
        {
            throw new InvalidOperationException(
                "JWT setting 'JwtSettings:ExpirationMinutes' must be a positive integer when present.");
        }

        return expirationMinutes;
    }
}
