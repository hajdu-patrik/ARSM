using Amazon.Runtime;
using Amazon.S3;

namespace AutoService.ApiService.Storage;

/** DI wiring for S3-compatible profile-picture storage; settings are resolved eagerly here so a
    misconfigured environment fails at startup, matching the JWT secret and connection string handling. */
public static class ObjectStorageRegistration
{
    /** Registers object-storage settings, the S3 client, the storage abstraction, and the bucket check. */
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

    /** Creates an S3 client pointed at the configured endpoint, which may be MinIO, Cloudflare R2, or AWS S3. */
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
