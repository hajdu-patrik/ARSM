using Amazon.Runtime;
using Amazon.S3;
using Azure.Storage.Blobs;

namespace AutoService.ApiService.Storage;

/** DI wiring for profile-picture storage (S3-compatible or Azure Blob); settings are resolved eagerly so a
    misconfigured environment fails at startup, matching the JWT secret and connection string handling. */
public static class ObjectStorageRegistration
{
    /** Registers the configured provider's settings, client, storage abstraction and startup check. */
    public static IServiceCollection AddProfilePictureObjectStorage(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        if (ObjectStorageSettingsResolver.ResolveProvider(configuration) == ObjectStorageProvider.AzureBlob)
        {
            return services.AddAzureBlobProfilePictureStorage(configuration);
        }

        var settings = ObjectStorageSettingsResolver.Resolve(configuration);

        services.AddSingleton(settings);
        services.AddSingleton<IAmazonS3>(_ => CreateS3Client(settings));
        services.AddSingleton<IProfilePictureStorage, S3ProfilePictureStorage>();
        services.AddHostedService<ObjectStorageBucketInitializer>();

        return services;
    }

    /** Registers the Azure Blob container client, storage implementation and container check. */
    private static IServiceCollection AddAzureBlobProfilePictureStorage(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var settings = ObjectStorageSettingsResolver.ResolveAzureBlob(configuration);

        services.AddSingleton(settings);
        services.AddSingleton(_ => new BlobContainerClient(settings.ConnectionString, settings.ContainerName));
        services.AddSingleton<IProfilePictureStorage, AzureBlobProfilePictureStorage>();
        services.AddHostedService<AzureBlobContainerInitializer>();

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
