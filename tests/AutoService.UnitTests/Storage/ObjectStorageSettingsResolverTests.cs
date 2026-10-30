using AutoService.ApiService.Storage;
using AutoService.UnitTests.Configuration;
using Microsoft.Extensions.Configuration;

namespace AutoService.UnitTests.Storage;

/** The Azure Blob settings are resolved from the account endpoint and the managed identity client id, never a key. */
[Collection(ProcessEnvironmentCollection.Name)]
public sealed class ObjectStorageSettingsResolverTests : IDisposable
{
    private readonly ProcessEnvironmentScope environment = new(ObjectStorageTestConfig.VariableNames);

    public void Dispose() => environment.Dispose();

    private const string ClientId = "0f8fad5b-d9cb-469f-a165-70867728950e";

    private static IConfiguration Configure(
        string? serviceUrl = "https://arsmst.blob.core.windows.net",
        string? clientId = ClientId)
    {
        var values = new Dictionary<string, string?>
        {
            ["ObjectStorage:ServiceUrl"] = serviceUrl,
            ["ObjectStorage:ManagedIdentityClientId"] = clientId,
            ["ObjectStorage:BucketName"] = "arsm-profile-pictures",
            ["ObjectStorage:AutoCreateBucket"] = "false"
        };

        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }

    [Fact]
    public void Valid_azure_blob_settings_resolve()
    {
        var settings = ObjectStorageSettingsResolver.ResolveAzureBlob(Configure());

        Assert.Equal(new Uri("https://arsmst.blob.core.windows.net"), settings.ServiceUri);
        Assert.Equal(ClientId, settings.ManagedIdentityClientId);
        Assert.Equal("arsm-profile-pictures", settings.ContainerName);
        Assert.False(settings.AutoCreateContainer);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("http://arsmst.blob.core.windows.net")]
    [InlineData("arsmst.blob.core.windows.net")]
    public void A_missing_or_non_https_service_url_throws(string? serviceUrl)
    {
        Assert.Throws<InvalidOperationException>(
            () => ObjectStorageSettingsResolver.ResolveAzureBlob(Configure(serviceUrl: serviceUrl)));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-a-guid")]
    public void A_missing_or_non_guid_client_id_throws(string? clientId)
    {
        Assert.Throws<InvalidOperationException>(
            () => ObjectStorageSettingsResolver.ResolveAzureBlob(Configure(clientId: clientId)));
    }
}
