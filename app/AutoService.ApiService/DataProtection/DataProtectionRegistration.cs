using Azure.Identity;
using Microsoft.AspNetCore.DataProtection;

namespace AutoService.ApiService.DataProtection;

/** DI wiring for the persistent DataProtection key ring; settings resolve eagerly so a misconfigured
    environment fails at startup, matching the object-storage handling. */
internal static class DataProtectionRegistration
{
    /** Fixed application name, so the key ring no longer depends on the content root path. */
    private const string ApplicationName = "arsm";

    /** Persists keys for the configured provider; an absent provider keeps the framework default key ring. */
    internal static IServiceCollection AddArsmDataProtection(this IServiceCollection services, IConfiguration configuration)
    {
        var provider = DataProtectionSettingsResolver.ResolveProvider(configuration);
        var builder = services.AddDataProtection().SetApplicationName(ApplicationName);

        switch (provider)
        {
            case DataProtectionKeyProvider.FileSystem:
                AddFileSystemKeyRing(builder, DataProtectionSettingsResolver.ResolveFileSystem(configuration));
                break;
            case DataProtectionKeyProvider.AzureBlob:
                AddAzureBlobKeyRing(builder, DataProtectionSettingsResolver.ResolveAzureBlob(configuration));
                break;
        }

        return services;
    }

    /** Stores the unencrypted key ring in the configured directory, creating it when missing. */
    private static void AddFileSystemKeyRing(IDataProtectionBuilder builder, FileSystemDataProtectionSettings settings)
    {
        var keyDirectory = Directory.CreateDirectory(settings.KeyDirectory);

        builder.PersistKeysToFileSystem(keyDirectory);
    }

    /** Stores the key ring in a blob wrapped by a Key Vault key, signing in as the user-assigned identity. */
    private static void AddAzureBlobKeyRing(IDataProtectionBuilder builder, AzureBlobDataProtectionSettings settings)
    {
        var credential = new ManagedIdentityCredential(ManagedIdentityId.FromUserAssignedClientId(settings.ManagedIdentityClientId));

        builder
            .PersistKeysToAzureBlobStorage(settings.BlobUri, credential)
            .ProtectKeysWithAzureKeyVault(settings.KeyVaultKeyUri, credential);
    }
}
