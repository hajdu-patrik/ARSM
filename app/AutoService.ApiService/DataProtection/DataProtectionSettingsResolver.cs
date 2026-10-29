using AutoService.ApiService.Configuration;

namespace AutoService.ApiService.DataProtection;

/** Resolves 'DataProtection:*' settings, preferring 'DataProtection__*' environment variables over config;
    throws at startup on a blank, placeholder, or invalid value and never echoes the value itself. */
internal static class DataProtectionSettingsResolver
{
    private const string ConfigurationSection = "DataProtection";

    /** Returns null when 'DataProtection:Provider' is absent (framework default key ring), else the provider. */
    internal static DataProtectionKeyProvider? ResolveProvider(IConfiguration configuration)
    {
        if (ResolveRawValue(configuration, "Provider") is null)
        {
            return null;
        }

        var value = ResolveRequiredValue(configuration, "Provider").Trim();
        var providerName = Enum.GetNames<DataProtectionKeyProvider>()
            .FirstOrDefault(name => string.Equals(name, value, StringComparison.OrdinalIgnoreCase));

        return providerName is null
            ? throw new InvalidOperationException(
                $"DataProtection setting '{ConfigurationSection}:Provider' must be 'FileSystem' or 'AzureBlob'.")
            : Enum.Parse<DataProtectionKeyProvider>(providerName);
    }

    /** Resolves the file-system settings; the key directory must be an absolute path. */
    internal static FileSystemDataProtectionSettings ResolveFileSystem(IConfiguration configuration)
    {
        return new FileSystemDataProtectionSettings(
            KeyDirectory: ResolveAbsolutePath(configuration, "KeyDirectory"));
    }

    /** Resolves the Azure Blob + Key Vault settings, all of them required. */
    internal static AzureBlobDataProtectionSettings ResolveAzureBlob(IConfiguration configuration)
    {
        return new AzureBlobDataProtectionSettings(
            BlobUri: ResolveHttpsUri(configuration, "BlobUri"),
            KeyVaultKeyUri: ResolveHttpsUri(configuration, "KeyVaultKeyUri"),
            ManagedIdentityClientId: ResolveGuid(configuration, "ManagedIdentityClientId"));
    }

    /** Reads a required string setting and rejects blank values and template placeholders. */
    private static string ResolveRequiredValue(IConfiguration configuration, string key)
    {
        var value = ResolveRawValue(configuration, key);

        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"DataProtection setting '{ConfigurationSection}:{key}' is missing or blank. Set it in configuration or the '{ConfigurationSection}__{key}' environment variable.");
        }

        if (TemplateMarkerDetector.ContainsTemplateMarker(value))
        {
            throw new InvalidOperationException(
                $"DataProtection setting '{ConfigurationSection}:{key}' still contains a template placeholder marker (for example CHANGE_ME or SET_UNIQUE_LOCAL). Replace it with a real value before startup.");
        }

        return value;
    }

    /** Reads a required setting that must be a fully qualified file-system path. */
    private static string ResolveAbsolutePath(IConfiguration configuration, string key)
    {
        var value = ResolveRequiredValue(configuration, key);

        if (!Path.IsPathFullyQualified(value))
        {
            throw new InvalidOperationException(
                $"DataProtection setting '{ConfigurationSection}:{key}' must be an absolute path.");
        }

        return value;
    }

    /** Reads a required setting that must be an absolute https URI. */
    private static Uri ResolveHttpsUri(IConfiguration configuration, string key)
    {
        var value = ResolveRequiredValue(configuration, key);

        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
        {
            throw new InvalidOperationException(
                $"DataProtection setting '{ConfigurationSection}:{key}' must be an absolute https URL.");
        }

        return uri;
    }

    /** Reads a required setting that must be a GUID and returns it in canonical form. */
    private static string ResolveGuid(IConfiguration configuration, string key)
    {
        var value = ResolveRequiredValue(configuration, key);

        if (!Guid.TryParse(value, out var parsed))
        {
            throw new InvalidOperationException(
                $"DataProtection setting '{ConfigurationSection}:{key}' must be a GUID.");
        }

        return parsed.ToString();
    }

    /** Reads the raw value, letting a non-blank environment variable win; null means the key is absent. */
    private static string? ResolveRawValue(IConfiguration configuration, string key)
    {
        var fromEnvironment = Environment.GetEnvironmentVariable($"{ConfigurationSection}__{key}");

        return string.IsNullOrWhiteSpace(fromEnvironment)
            ? configuration[$"{ConfigurationSection}:{key}"]
            : fromEnvironment;
    }
}
