using Amazon.S3;
using Amazon.S3.Model;

namespace AutoService.ApiService.Storage;

/**
 * S3-compatible profile-picture storage backed by the AWS SDK.
 *
 * Every save writes a new GUID-suffixed key instead of overwriting the previous one,
 * so readers never race a concurrent replacement and browser/CDN caches cannot serve
 * a stale body under an unchanged URL.
 */
internal sealed class S3ProfilePictureStorage(
    IAmazonS3 s3Client,
    ObjectStorageSettings settings,
    ILogger<S3ProfilePictureStorage> logger) : IProfilePictureStorage
{
    private const string ObjectKeyPrefix = "profile-pictures";
    private const string ObjectKeyExtension = ".webp";

    /**
     * Uploads the processed picture under a new key and returns that key for persistence.
     */
    public async Task<string> SaveAsync(
        int personId,
        byte[] content,
        string contentType,
        CancellationToken cancellationToken)
    {
        var objectKey = BuildObjectKey(personId);

        using var contentStream = new MemoryStream(content, writable: false);

        await s3Client.PutObjectAsync(
            new PutObjectRequest
            {
                BucketName = settings.BucketName,
                Key = objectKey,
                InputStream = contentStream,
                ContentType = contentType,
                DisablePayloadSigning = false
            },
            cancellationToken);

        return objectKey;
    }

    /**
     * Opens the stored object for streaming, mapping a missing object to null.
     */
    public async Task<Stream?> OpenReadAsync(string objectKey, CancellationToken cancellationToken)
    {
        try
        {
            var response = await s3Client.GetObjectAsync(
                new GetObjectRequest
                {
                    BucketName = settings.BucketName,
                    Key = objectKey
                },
                cancellationToken);

            return response.ResponseStream;
        }
        catch (AmazonS3Exception exception) when (IsMissingObject(exception))
        {
            logger.LogWarning(
                "Profile picture object '{ObjectKey}' is referenced by the database but missing from the bucket.",
                objectKey);

            return null;
        }
    }

    /**
     * Deletes the stored object; S3 delete is idempotent, so a missing object is not an error.
     */
    public async Task DeleteAsync(string objectKey, CancellationToken cancellationToken)
    {
        await s3Client.DeleteObjectAsync(
            new DeleteObjectRequest
            {
                BucketName = settings.BucketName,
                Key = objectKey
            },
            cancellationToken);
    }

    /**
     * Reads object metadata only, so verification never transfers picture bodies.
     */
    public async Task<long?> GetObjectSizeAsync(string objectKey, CancellationToken cancellationToken)
    {
        try
        {
            var response = await s3Client.GetObjectMetadataAsync(
                new GetObjectMetadataRequest
                {
                    BucketName = settings.BucketName,
                    Key = objectKey
                },
                cancellationToken);

            return response.ContentLength;
        }
        catch (AmazonS3Exception exception) when (IsMissingObject(exception))
        {
            return null;
        }
    }

    /**
     * Builds a collision-free object key scoped to the owning person.
     */
    private static string BuildObjectKey(int personId)
        => $"{ObjectKeyPrefix}/{personId}/{Guid.NewGuid():N}{ObjectKeyExtension}";

    /**
     * Detects the S3 error shapes that mean the requested object does not exist.
     */
    private static bool IsMissingObject(AmazonS3Exception exception)
        => exception.StatusCode == System.Net.HttpStatusCode.NotFound
           || string.Equals(exception.ErrorCode, "NoSuchKey", StringComparison.Ordinal);
}
