namespace AutoService.ApiService.Storage;

/** Azure Blob Storage configuration resolved at startup ('ObjectStorage:Provider' = AzureBlob). */
public sealed record AzureBlobStorageSettings(
    string ConnectionString,
    string ContainerName,
    bool AutoCreateContainer);
