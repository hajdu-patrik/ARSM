using AutoService.ApiService.Configuration;

namespace AutoService.ApiService.Email.Sending;

/** Resolves the Email section (Email__* environment variables win through the configuration
    providers); a blank key is valid (no-op sender), a set key makes the other values required. */
public static class EmailSettingsResolver
{
    private const string ConfigurationSection = "Email";

    public static EmailSettings Resolve(IConfiguration configuration)
    {
        var apiKey = ReadTrimmed(configuration, "ResendApiKey");

        if (string.IsNullOrEmpty(apiKey))
        {
            return new EmailSettings(null, string.Empty, string.Empty, string.Empty);
        }

        RejectTemplateMarker("ResendApiKey", apiKey);

        return new EmailSettings(
            ResendApiKey: apiKey,
            From: ResolveRequiredValue(configuration, "From"),
            ReplyTo: ResolveRequiredValue(configuration, "ReplyTo"),
            PublicUrl: ResolveRequiredValue(configuration, "PublicUrl"));
    }

    /** Reads a value that is required once a key is set and rejects blanks and template placeholders. */
    private static string ResolveRequiredValue(IConfiguration configuration, string key)
    {
        var value = ReadTrimmed(configuration, key);

        if (string.IsNullOrEmpty(value))
        {
            throw new InvalidOperationException(
                $"E-mail setting '{ConfigurationSection}:{key}' is missing while '{ConfigurationSection}:ResendApiKey' is set. Set it in appsettings.Local.json or the '{ConfigurationSection}__{key}' environment variable.");
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
