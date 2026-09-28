using AutoService.ApiService.Configuration;

namespace AutoService.ApiService.Storage;

/** Resolves object-storage settings, preferring 'ObjectStorage__*' environment variables over
    appsettings (AppHost/CI injection); throws at startup on a missing, placeholder, or unparsable value. */
public static class ObjectStorageSettingsResolver
{
    private const string ConfigurationSection = "ObjectStorage";

    /** Reads 'ObjectStorage:Provider': S3 (default when unset, so existing configs keep working) or AzureBlob. */
    public static ObjectStorageProvider ResolveProvider(IConfiguration configuration)
    {
        var value = ResolveRawValue(configuration, "Provider");

        if (string.IsNullOrWhiteSpace(value))
        {
            return ObjectStorageProvider.S3;
        }

        return Enum.TryParse<ObjectStorageProvider>(value, ignoreCase: true, out var provider)
            ? provider
            : throw new InvalidOperationException($"Object storage setting '{ConfigurationSection}:Provider' must be 'S3' or 'AzureBlob'.");
    }

    /** Resolves the Azure Blob settings (the container name reuses 'BucketName'), failing fast like the S3 set. */
    public static AzureBlobStorageSettings ResolveAzureBlob(IConfiguration configuration)
    {
        return new AzureBlobStorageSettings(
            ConnectionString: ResolveRequiredValue(configuration, "ConnectionString"),
            ContainerName: ResolveRequiredValue(configuration, "BucketName"),
            AutoCreateContainer: ResolveRequiredFlag(configuration, "AutoCreateBucket"));
    }

    /** Resolves the complete object-storage settings set and fails fast on invalid configuration. */
    public static ObjectStorageSettings Resolve(IConfiguration configuration)
    {
        return new ObjectStorageSettings(
            ServiceUrl: ResolveRequiredValue(configuration, "ServiceUrl"),
            Region: ResolveRequiredValue(configuration, "Region"),
            BucketName: ResolveRequiredValue(configuration, "BucketName"),
            AccessKeyId: ResolveRequiredValue(configuration, "AccessKeyId"),
            SecretAccessKey: ResolveRequiredValue(configuration, "SecretAccessKey"),
            ForcePathStyle: ResolveRequiredFlag(configuration, "ForcePathStyle"),
            AutoCreateBucket: ResolveRequiredFlag(configuration, "AutoCreateBucket"),
            DisablePayloadSigning: ResolveRequiredFlag(configuration, "DisablePayloadSigning"),
            DisableDefaultChecksumValidation: ResolveRequiredFlag(configuration, "DisableDefaultChecksumValidation"));
    }

    /** Reads a required string setting and rejects blank values and template placeholders. */
    private static string ResolveRequiredValue(IConfiguration configuration, string key)
    {
        var value = ResolveRawValue(configuration, key);

        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"Object storage setting '{ConfigurationSection}:{key}' is missing. Run through AppHost (Aspire injects it), or set it in appsettings.Local.json or the '{ConfigurationSection}__{key}' environment variable.");
        }

        if (TemplateMarkerDetector.ContainsTemplateMarker(value))
        {
            throw new InvalidOperationException(
                $"Object storage setting '{ConfigurationSection}:{key}' still contains a template placeholder marker (for example CHANGE_ME or SET_UNIQUE_LOCAL). Replace it with a real local value before startup.");
        }

        return value;
    }

    /** Reads a required boolean setting and rejects blank or unparsable values. */
    private static bool ResolveRequiredFlag(IConfiguration configuration, string key)
    {
        var value = ResolveRawValue(configuration, key);

        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"Object storage setting '{ConfigurationSection}:{key}' is missing. Set it to 'true' or 'false' in appsettings or the '{ConfigurationSection}__{key}' environment variable.");
        }

        if (!bool.TryParse(value, out var parsed))
        {
            throw new InvalidOperationException(
                $"Object storage setting '{ConfigurationSection}:{key}' must be 'true' or 'false'.");
        }

        return parsed;
    }

    /** Reads the raw setting value, letting the environment variable win over configuration. */
    private static string? ResolveRawValue(IConfiguration configuration, string key)
    {
        var fromEnvironment = Environment.GetEnvironmentVariable($"{ConfigurationSection}__{key}");

        return string.IsNullOrWhiteSpace(fromEnvironment)
            ? configuration[$"{ConfigurationSection}:{key}"]
            : fromEnvironment;
    }
}
