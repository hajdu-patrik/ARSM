using System.Globalization;
using System.Text;

namespace AutoService.ApiService.Configuration;

/** Prefers the 'JwtSettings__Secret' environment variable over appsettings; startup fails on a missing, placeholder or shorter-than-32-byte secret (HMAC-SHA256 minimum). */
public static class JwtSettingsResolver
{
    private const int DefaultExpirationMinutes = 10;

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

    /** Defaults to 10 minutes when 'JwtSettings:ExpirationMinutes' is missing or blank; startup fails when it is not a positive integer. */
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
