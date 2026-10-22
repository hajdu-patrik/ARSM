namespace AutoService.ApiService.Storage;

/** S3-compatible object storage configuration resolved at startup; the same shape serves RustFS locally and Cloudflare R2 / AWS S3 when hosted. */
public sealed record ObjectStorageSettings(
    string ServiceUrl,
    string Region,
    string BucketName,
    string AccessKeyId,
    string SecretAccessKey,
    bool ForcePathStyle,
    bool AutoCreateBucket,
    bool DisablePayloadSigning,
    bool DisableDefaultChecksumValidation);
