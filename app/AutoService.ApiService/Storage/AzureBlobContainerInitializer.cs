using Azure.Storage.Blobs;

namespace AutoService.ApiService.Storage;

/** Verifies the profile-picture blob container at startup, creating it (private) only when
    'ObjectStorage:AutoCreateBucket' opts in; mirrors ObjectStorageBucketInitializer. */
internal sealed class AzureBlobContainerInitializer(
    BlobContainerClient containerClient,
    AzureBlobStorageSettings settings,
    ILogger<AzureBlobContainerInitializer> logger) : IHostedService
{
    /** Checks container availability and fails fast when it is missing and cannot be created. */
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (await containerClient.ExistsAsync(cancellationToken))
        {
            logger.LogInformation("Profile picture container '{ContainerName}' is available.", settings.ContainerName);
            return;
        }

        if (!settings.AutoCreateContainer)
        {
            throw new InvalidOperationException(
                $"Blob container '{settings.ContainerName}' does not exist and 'ObjectStorage:AutoCreateBucket' is disabled. Provision the container before starting the API.");
        }

        await containerClient.CreateIfNotExistsAsync(cancellationToken: cancellationToken);
        logger.LogInformation("Created profile picture container '{ContainerName}'.", settings.ContainerName);
    }

    /** No shutdown work is required for the container check. */
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
