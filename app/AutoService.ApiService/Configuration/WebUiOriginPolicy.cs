using System.Net;

namespace AutoService.ApiService.Configuration;

/** Resolves and validates WebUI origins shared by CORS and unsafe-request origin checks. */
public sealed class WebUiOriginPolicy
{
    private readonly HashSet<string> allowedOrigins;

    private WebUiOriginPolicy(IReadOnlyList<string> allowedOrigins)
    {
        var normalizedAllowedOrigins = allowedOrigins.ToArray();
        AllowedOrigins = normalizedAllowedOrigins;
        this.allowedOrigins = new HashSet<string>(normalizedAllowedOrigins, StringComparer.OrdinalIgnoreCase);
    }

    /** Normalized origins allowed to call the API with browser credentials. */
    public IReadOnlyList<string> AllowedOrigins { get; }

    /** Creates a validated origin policy from configuration. */
    public static WebUiOriginPolicy Create(IConfiguration configuration, IHostEnvironment environment)
    {
        var configuredOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?.Where(static origin => !string.IsNullOrWhiteSpace(origin))
            .ToArray()
            ?? [];

        if (configuredOrigins.Length == 0)
        {
            throw new InvalidOperationException(
                "CORS allowed origins are missing. Configure 'Cors:AllowedOrigins' for the WebUI endpoint.");
        }

        var normalizedOrigins = configuredOrigins
            .Select(origin => NormalizeOrigin(origin, environment))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return new WebUiOriginPolicy(normalizedOrigins);
    }

    /** Returns true when the supplied Origin header matches a configured WebUI origin. */
    public bool Allows(string? origin)
    {
        return !string.IsNullOrWhiteSpace(origin) && allowedOrigins.Contains(origin.Trim());
    }

    /** Normalizes one configured origin and rejects values unsafe for the active environment. */
    private static string NormalizeOrigin(string rawOrigin, IHostEnvironment environment)
    {
        var origin = rawOrigin.Trim();
        if (origin.Contains('*', StringComparison.Ordinal) || origin.Equals("null", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("CORS allowed origins must be explicit HTTP(S) origins, not wildcard or null values.");
        }

        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri) || !IsHttpOrigin(uri))
        {
            throw new InvalidOperationException($"CORS allowed origin '{origin}' must be an absolute HTTP(S) origin.");
        }

        if (uri.AbsolutePath != "/" || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment))
        {
            throw new InvalidOperationException($"CORS allowed origin '{origin}' must not include path, query, or fragment components.");
        }

        if (!environment.IsDevelopment() && IsUnsafeProductionOrigin(uri))
        {
            throw new InvalidOperationException(
                $"CORS allowed origin '{origin}' is not safe for non-Development environments. Use HTTPS and a non-localhost production host.");
        }

        return uri.IsDefaultPort
            ? $"{uri.Scheme}://{uri.Host.ToLowerInvariant()}"
            : $"{uri.Scheme}://{uri.Host.ToLowerInvariant()}:{uri.Port}";
    }

    private static bool IsHttpOrigin(Uri uri)
    {
        return uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            || uri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsUnsafeProductionOrigin(Uri uri)
    {
        return !uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            || uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
            || (IPAddress.TryParse(uri.Host, out var ipAddress) && IPAddress.IsLoopback(ipAddress));
    }
}