using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Util;

namespace AutoService.ApiService.Storage;

/**
 * Verifies the profile-picture bucket at startup and creates it only when the
 * environment explicitly opts in through 'ObjectStorage:AutoCreateBucket'.
 *
 * Local development enables auto-creation so a fresh MinIO volume works out of the
 * box; hosted environments keep it disabled so the bucket stays a deliberate,
 * privately provisioned resource.
 */
internal sealed class ObjectStorageBucketInitializer(
    IAmazonS3 s3Client,
    ObjectStorageSettings settings,
    ILogger<ObjectStorageBucketInitializer> logger) : IHostedService
{
    /**
     * Checks bucket availability and fails fast when the bucket is missing and cannot be created.
     */
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (await AmazonS3Util.DoesS3BucketExistV2Async(s3Client, settings.BucketName))
        {
            logger.LogInformation("Profile picture bucket '{BucketName}' is available.", settings.BucketName);
            return;
        }

        if (!settings.AutoCreateBucket)
        {
            throw new InvalidOperationException(
                $"Object storage bucket '{settings.BucketName}' does not exist and 'ObjectStorage:AutoCreateBucket' is disabled. Provision the bucket before starting the API.");
        }

        await s3Client.PutBucketAsync(
            new PutBucketRequest { BucketName = settings.BucketName },
            cancellationToken);

        logger.LogInformation("Created profile picture bucket '{BucketName}'.", settings.BucketName);
    }

    /**
     * No shutdown work is required for the bucket check.
     */
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
