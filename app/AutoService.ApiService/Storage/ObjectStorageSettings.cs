namespace AutoService.ApiService.Storage;

/**
 * Immutable S3-compatible object storage configuration resolved at startup.
 *
 * The same shape serves MinIO locally and Cloudflare R2 / AWS S3 in hosted
 * environments; only the resolved values differ.
 */
public sealed record ObjectStorageSettings(
    string ServiceUrl,
    string Region,
    string BucketName,
    string AccessKeyId,
    string SecretAccessKey,
    bool ForcePathStyle,
    bool AutoCreateBucket);
