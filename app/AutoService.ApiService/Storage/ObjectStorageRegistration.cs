using Amazon.Runtime;
using Amazon.S3;

namespace AutoService.ApiService.Storage;

/**
 * Dependency-injection wiring for S3-compatible profile-picture storage.
 *
 * Settings are resolved eagerly during registration so a misconfigured environment
 * fails at startup instead of on the first upload, matching how the JWT secret and
 * the database connection string are handled.
 */
public static class ObjectStorageRegistration
{
    /**
     * Registers object-storage settings, the S3 client, the storage abstraction, and the bucket check.
     *
     * @param services Application service collection.
     * @param configuration Application configuration root.
     * @return The same service collection for chaining.
     */
    public static IServiceCollection AddProfilePictureObjectStorage(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var settings = ObjectStorageSettingsResolver.Resolve(configuration);

        services.AddSingleton(settings);
        services.AddSingleton<IAmazonS3>(_ => CreateS3Client(settings));
        services.AddSingleton<IProfilePictureStorage, S3ProfilePictureStorage>();
        services.AddHostedService<ObjectStorageBucketInitializer>();

        return services;
    }

    /**
     * Creates an S3 client pointed at the configured endpoint, which may be MinIO, Cloudflare R2, or AWS S3.
     */
    private static IAmazonS3 CreateS3Client(ObjectStorageSettings settings)
    {
        var s3Config = new AmazonS3Config
        {
            ServiceURL = settings.ServiceUrl,
            ForcePathStyle = settings.ForcePathStyle,
            AuthenticationRegion = settings.Region
        };

        var credentials = new BasicAWSCredentials(settings.AccessKeyId, settings.SecretAccessKey);

        return new AmazonS3Client(credentials, s3Config);
    }
}
