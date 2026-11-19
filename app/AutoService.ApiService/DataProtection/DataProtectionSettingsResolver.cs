using AutoService.ApiService.Configuration;

namespace AutoService.ApiService.DataProtection;

/** Resolves 'DataProtection:*' settings, preferring 'DataProtection__*' environment variables over config;
    throws at startup on a blank, placeholder, or invalid value and never echoes the value itself. */
internal static class DataProtectionSettingsResolver
{
    private const string ConfigurationSection = "DataProtection";

    private static readonly EnvironmentFirstSettingReader Reader = new(
        ConfigurationSection,
        "DataProtection setting",
        key => $"DataProtection setting '{ConfigurationSection}:{key}' is missing or blank. Set it in configuration or the '{ConfigurationSection}__{key}' environment variable.",
        "value");

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

    private static string ResolveRequiredValue(IConfiguration configuration, string key) => Reader.ReadRequired(configuration, key);

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

    private static Uri ResolveHttpsUri(IConfiguration configuration, string key) => Reader.ReadHttpsUri(configuration, key);

    private static string ResolveGuid(IConfiguration configuration, string key) => Reader.ReadGuid(configuration, key);

    private static string? ResolveRawValue(IConfiguration configuration, string key) => Reader.ReadRaw(configuration, key);
}
