using Amazon.S3;
using AutoService.ApiService.Storage;
using AutoService.UnitTests.Configuration;
using Azure.Storage.Blobs;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using static AutoService.UnitTests.Storage.ObjectStorageTestConfig;

namespace AutoService.UnitTests.Storage;

/** The provider switch of the DI wiring: what each provider registers, fail-fast settings, key format. */
[Collection(ProcessEnvironmentCollection.Name)]
public sealed class ObjectStorageRegistrationTests : IDisposable
{
    private readonly ProcessEnvironmentScope environment = new(VariableNames);

    public void Dispose() => environment.Dispose();

    private static ServiceCollection Register(Dictionary<string, string?> values)
    {
        var services = new ServiceCollection();
        var returned = services.AddProfilePictureObjectStorage(Build(values));

        Assert.Same(services, returned);
        return services;
    }

    private static Type? ImplementationOf(IServiceCollection services, Type serviceType) =>
        services.SingleOrDefault(descriptor => descriptor.ServiceType == serviceType)?.ImplementationType;

    [Fact]
    public void Without_a_provider_the_s3_storage_and_bucket_check_are_registered()
    {
        var services = Register(S3Values());

        Assert.Equal(typeof(S3ProfilePictureStorage), ImplementationOf(services, typeof(IProfilePictureStorage)));
        Assert.Equal(typeof(ObjectStorageBucketInitializer), ImplementationOf(services, typeof(IHostedService)));
        Assert.Contains(services, descriptor => descriptor.ServiceType == typeof(ObjectStorageSettings));
        Assert.DoesNotContain(services, descriptor => descriptor.ServiceType == typeof(AzureBlobStorageSettings));
    }

    [Fact]
    public void The_s3_client_is_built_from_the_resolved_settings()
    {
        using var provider = Register(S3Values()).BuildServiceProvider();

        var config = Assert.IsType<AmazonS3Config>(Assert.IsType<AmazonS3Client>(provider.GetRequiredService<IAmazonS3>()).Config);

        Assert.Equal("http://localhost:9000", config.ServiceURL.TrimEnd('/'));
        Assert.True(config.ForcePathStyle);
        Assert.Equal("us-east-1", config.AuthenticationRegion);
    }

    [Fact]
    public void The_azure_blob_provider_registers_its_own_storage_check_and_container_client()
    {
        var services = Register(AzureValues());
        using var provider = services.BuildServiceProvider();

        Assert.Equal(typeof(AzureBlobProfilePictureStorage), ImplementationOf(services, typeof(IProfilePictureStorage)));
        Assert.Equal(typeof(AzureBlobContainerInitializer), ImplementationOf(services, typeof(IHostedService)));
        Assert.DoesNotContain(services, descriptor => descriptor.ServiceType == typeof(ObjectStorageSettings));
        Assert.DoesNotContain(services, descriptor => descriptor.ServiceType == typeof(IAmazonS3));
        var container = provider.GetRequiredService<BlobContainerClient>();
        Assert.Equal(new Uri("https://arsmst.blob.core.windows.net/arsm-profile-pictures"), container.Uri);
        Assert.Equal("arsm-profile-pictures", container.Name);
    }

    [Fact]
    public void A_misconfigured_provider_fails_at_registration_not_at_the_first_request()
    {
        var s3 = S3Values();
        s3.Remove("ObjectStorage:BucketName");
        var azure = AzureValues();
        azure["ObjectStorage:ServiceUrl"] = "http://insecure.example.test";
        var unknown = S3Values();
        unknown["ObjectStorage:Provider"] = "Redis";

        Assert.Throws<InvalidOperationException>(() => Register(s3));
        Assert.Throws<InvalidOperationException>(() => Register(azure));
        Assert.Throws<InvalidOperationException>(() => Register(unknown));
    }

    [Fact]
    public void An_object_key_is_scoped_to_the_person_ends_in_webp_and_never_repeats()
    {
        var first = ProfilePictureObjectKeys.Create(42);
        var second = ProfilePictureObjectKeys.Create(42);

        Assert.Matches("^profile-pictures/42/[0-9a-f]{32}\\.webp$", first);
        Assert.NotEqual(first, second);
        Assert.StartsWith("profile-pictures/7/", ProfilePictureObjectKeys.Create(7));
    }
}
