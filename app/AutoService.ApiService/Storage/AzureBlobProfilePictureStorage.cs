using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace AutoService.ApiService.Storage;

/** Azure Blob Storage profile-picture storage; same contract and key format as the S3 implementation. */
internal sealed class AzureBlobProfilePictureStorage(
    BlobContainerClient containerClient,
    ILogger<AzureBlobProfilePictureStorage> logger) : IProfilePictureStorage
{
    /** Uploads the processed picture under a new key and returns that key for persistence. */
    public async Task<string> SaveAsync(
        int personId,
        byte[] content,
        string contentType,
        CancellationToken cancellationToken)
    {
        var objectKey = ProfilePictureObjectKeys.Create(personId);

        await containerClient.GetBlobClient(objectKey).UploadAsync(
            BinaryData.FromBytes(content),
            new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } },
            cancellationToken);

        return objectKey;
    }

    /** Opens the stored blob for streaming, mapping a missing blob to null. */
    public async Task<Stream?> OpenReadAsync(string objectKey, CancellationToken cancellationToken)
    {
        try
        {
            var response = await containerClient.GetBlobClient(objectKey).DownloadStreamingAsync(cancellationToken: cancellationToken);
            return response.Value.Content;
        }
        catch (RequestFailedException exception) when (exception.Status == StatusCodes.Status404NotFound)
        {
            logger.LogWarning(
                "Profile picture object '{ObjectKey}' is referenced by the database but missing from the container.",
                objectKey);

            return null;
        }
    }

    /** Deletes the stored blob; a missing blob is not an error. */
    public async Task DeleteAsync(string objectKey, CancellationToken cancellationToken)
        => await containerClient.GetBlobClient(objectKey).DeleteIfExistsAsync(cancellationToken: cancellationToken);

    /** Reads blob properties only, so verification never transfers picture bodies. */
    public async Task<long?> GetObjectSizeAsync(string objectKey, CancellationToken cancellationToken)
    {
        try
        {
            var properties = await containerClient.GetBlobClient(objectKey).GetPropertiesAsync(cancellationToken: cancellationToken);
            return properties.Value.ContentLength;
        }
        catch (RequestFailedException exception) when (exception.Status == StatusCodes.Status404NotFound)
        {
            return null;
        }
    }
}
