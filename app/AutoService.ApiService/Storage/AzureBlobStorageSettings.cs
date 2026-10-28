namespace AutoService.ApiService.Storage;

/** Azure Blob Storage configuration resolved at startup ('ObjectStorage:Provider' = AzureBlob). */
public sealed record AzureBlobStorageSettings(
    Uri ServiceUri,
    string ManagedIdentityClientId,
    string ContainerName,
    bool AutoCreateContainer);
