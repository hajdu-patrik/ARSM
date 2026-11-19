namespace AutoService.ApiService.Configuration;

/** Reads '{Section}__{key}' environment variables over configuration and checks required, https and GUID values. */
internal sealed class EnvironmentFirstSettingReader(
    string section,
    string label,
    Func<string, string> missingMessage,
    string placeholderValueText)
{
    /** Reads the raw value, letting a non-blank environment variable win; null means the key is absent. */
    internal string? ReadRaw(IConfiguration configuration, string key)
    {
        var fromEnvironment = Environment.GetEnvironmentVariable($"{section}__{key}");

        return string.IsNullOrWhiteSpace(fromEnvironment)
            ? configuration[$"{section}:{key}"]
            : fromEnvironment;
    }

    /** Reads a required string setting and rejects blank values and template placeholders. */
    internal string ReadRequired(IConfiguration configuration, string key)
    {
        var value = ReadRaw(configuration, key);

        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(missingMessage(key));
        }

        if (TemplateMarkerDetector.ContainsTemplateMarker(value))
        {
            throw new InvalidOperationException(
                $"{label} '{section}:{key}' still contains a template placeholder marker (for example CHANGE_ME or SET_UNIQUE_LOCAL). Replace it with a real {placeholderValueText} before startup.");
        }

        return value;
    }

    /** Reads a required setting that must be an absolute https URI. */
    internal Uri ReadHttpsUri(IConfiguration configuration, string key)
    {
        var value = ReadRequired(configuration, key);

        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
        {
            throw new InvalidOperationException($"{label} '{section}:{key}' must be an absolute https URL.");
        }

        return uri;
    }

    /** Reads a required setting that must be a GUID and returns it in canonical form. */
    internal string ReadGuid(IConfiguration configuration, string key)
    {
        var value = ReadRequired(configuration, key);

        if (!Guid.TryParse(value, out var parsed))
        {
            throw new InvalidOperationException($"{label} '{section}:{key}' must be a GUID.");
        }

        return parsed.ToString();
    }
}
