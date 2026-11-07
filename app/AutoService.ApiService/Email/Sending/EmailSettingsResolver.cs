using AutoService.ApiService.Configuration;

namespace AutoService.ApiService.Email.Sending;

/** Resolves the Email section (Email__* environment variables win through the configuration
    providers); a blank Endpoint is valid (no-op sender), a set one makes the other values required. */
public static class EmailSettingsResolver
{
    private const string ConfigurationSection = "Email";

    public static EmailSettings Resolve(IConfiguration configuration)
    {
        var endpoint = ReadTrimmed(configuration, "Endpoint");
        if (string.IsNullOrEmpty(endpoint))
        {
            return new EmailSettings(null, null, string.Empty, string.Empty, string.Empty);
        }

        RejectTemplateMarker("Endpoint", endpoint);
        if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var endpointUri) || endpointUri.Scheme != Uri.UriSchemeHttps)
        {
            throw new InvalidOperationException(
                $"E-mail setting '{ConfigurationSection}:Endpoint' must be an absolute https URL of the Communication Services resource.");
        }

        var clientId = ResolveRequiredValue(configuration, "ManagedIdentityClientId");
        if (!Guid.TryParse(clientId, out _))
        {
            throw new InvalidOperationException(
                $"E-mail setting '{ConfigurationSection}:ManagedIdentityClientId' must be the GUID client id of the managed identity.");
        }

        var from = ResolveRequiredValue(configuration, "From");
        if (!EmailHeaderSanitizer.IsSingleAddress(from))
        {
            throw new InvalidOperationException(
                $"E-mail setting '{ConfigurationSection}:From' must be one plain sender address, for example info@arsm.hu.");
        }

        return new EmailSettings(
            Endpoint: endpoint,
            ManagedIdentityClientId: clientId,
            From: from,
            ReplyTo: ResolveRequiredValue(configuration, "ReplyTo"),
            PublicUrl: ResolveRequiredValue(configuration, "PublicUrl"));
    }

    /** Reads a value that is required once an endpoint is set and rejects blanks and template placeholders. */
    private static string ResolveRequiredValue(IConfiguration configuration, string key)
    {
        var value = ReadTrimmed(configuration, key);
        if (string.IsNullOrEmpty(value))
        {
            throw new InvalidOperationException(
                $"E-mail setting '{ConfigurationSection}:{key}' is missing while '{ConfigurationSection}:Endpoint' is set. Set it with the '{ConfigurationSection}__{key}' environment variable.");
        }

        RejectTemplateMarker(key, value);
        return value;
    }

    private static void RejectTemplateMarker(string key, string value)
    {
        if (TemplateMarkerDetector.ContainsTemplateMarker(value))
        {
            throw new InvalidOperationException(
                $"E-mail setting '{ConfigurationSection}:{key}' still contains a template placeholder marker (for example CHANGE_ME or SET_UNIQUE_LOCAL). Replace it with a real value before startup.");
        }
    }

    private static string ReadTrimmed(IConfiguration configuration, string key) =>
        configuration[$"{ConfigurationSection}:{key}"]?.Trim() ?? string.Empty;
}
