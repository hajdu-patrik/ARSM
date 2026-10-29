namespace AutoService.ApiService.DataProtection;

/** Azure key-ring settings resolved at startup ('DataProtection:Provider' = AzureBlob). */
internal sealed record AzureBlobDataProtectionSettings(
    Uri BlobUri,
    Uri KeyVaultKeyUri,
    string ManagedIdentityClientId);
