using AutoService.ApiService.DataProtection;
using Microsoft.Extensions.Configuration;

namespace AutoService.UnitTests.DataProtection;

/** The AzureBlob provider needs two absolute https URIs and a GUID client id, all of them required. */
[Collection(DataProtectionEnvironmentCollection.Name)]
public sealed class AzureBlobDataProtectionSettingsTests
{
    private const string BlobUri = "https://arsmst.blob.core.windows.net/dataprotection/keys.xml";
    private const string KeyVaultKeyUri = "https://arsm-kv.vault.azure.net/keys/dataprotection";
    private const string ClientId = "0f8fad5b-d9cb-469f-a165-70867728950e";

    private static Dictionary<string, string?> FullValues() => new()
    {
        ["Provider"] = "AzureBlob",
        ["BlobUri"] = BlobUri,
        ["KeyVaultKeyUri"] = KeyVaultKeyUri,
        ["ManagedIdentityClientId"] = ClientId
    };

    private static IConfiguration Configure(Dictionary<string, string?> values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(v => new KeyValuePair<string, string?>($"DataProtection:{v.Key}", v.Value)))
            .Build();

    private static InvalidOperationException ResolveWith(string key, string? value)
    {
        var values = FullValues();
        values[key] = value;

        return Assert.Throws<InvalidOperationException>(() => DataProtectionSettingsResolver.ResolveAzureBlob(Configure(values)));
    }

    [Fact]
    public void Valid_azure_blob_settings_resolve()
    {
        var settings = DataProtectionSettingsResolver.ResolveAzureBlob(Configure(FullValues()));

        Assert.Equal(new Uri(BlobUri), settings.BlobUri);
        Assert.Equal(new Uri(KeyVaultKeyUri), settings.KeyVaultKeyUri);
        Assert.Equal(ClientId, settings.ManagedIdentityClientId);
    }

    [Fact]
    public void A_braced_upper_case_client_id_resolves_to_the_canonical_form()
    {
        var values = FullValues();
        values["ManagedIdentityClientId"] = "{" + ClientId.ToUpperInvariant() + "}";

        Assert.Equal(ClientId, DataProtectionSettingsResolver.ResolveAzureBlob(Configure(values)).ManagedIdentityClientId);
    }

    [Theory]
    [InlineData("BlobUri", null)]
    [InlineData("BlobUri", "")]
    [InlineData("KeyVaultKeyUri", null)]
    [InlineData("KeyVaultKeyUri", "  ")]
    [InlineData("ManagedIdentityClientId", null)]
    [InlineData("ManagedIdentityClientId", "")]
    public void A_missing_or_blank_value_throws(string key, string? value)
    {
        var exception = ResolveWith(key, value);

        Assert.Contains($"DataProtection:{key}", exception.Message);
        Assert.Contains("missing or blank", exception.Message);
    }

    [Theory]
    [InlineData("BlobUri", "http://arsmst.blob.core.windows.net/dataprotection/keys.xml")]
    [InlineData("BlobUri", "arsmst.blob.core.windows.net/dataprotection/keys.xml")]
    [InlineData("BlobUri", "dataprotection/keys.xml")]
    [InlineData("BlobUri", "ftp://arsmst.blob.core.windows.net/keys.xml")]
    [InlineData("KeyVaultKeyUri", "http://arsm-kv.vault.azure.net/keys/dataprotection")]
    [InlineData("KeyVaultKeyUri", "arsm-kv.vault.azure.net/keys/dataprotection")]
    [InlineData("KeyVaultKeyUri", "keys/dataprotection")]
    public void A_non_https_or_relative_uri_throws_without_echoing_it(string key, string value)
    {
        var exception = ResolveWith(key, value);

        Assert.Contains($"DataProtection:{key}", exception.Message);
        Assert.Contains("must be an absolute https URL", exception.Message);
        Assert.DoesNotContain(value, exception.Message);
    }

    [Theory]
    [InlineData("not-a-guid")]
    [InlineData("0f8fad5b-d9cb-469f-a165")]
    [InlineData("12345")]
    public void A_non_guid_client_id_throws_without_echoing_it(string value)
    {
        var exception = ResolveWith("ManagedIdentityClientId", value);

        Assert.Contains("DataProtection:ManagedIdentityClientId", exception.Message);
        Assert.Contains("must be a GUID", exception.Message);
        Assert.DoesNotContain(value, exception.Message);
    }

    [Theory]
    [InlineData("BlobUri", "https://CHANGE_ME.blob.core.windows.net/dataprotection/keys.xml")]
    [InlineData("KeyVaultKeyUri", "https://SET_UNIQUE_LOCAL.vault.azure.net/keys/dataprotection")]
    [InlineData("ManagedIdentityClientId", "CHANGE_ME")]
    public void A_template_marker_value_throws(string key, string value)
    {
        var exception = ResolveWith(key, value);

        Assert.Contains($"DataProtection:{key}", exception.Message);
        Assert.Contains("template placeholder marker", exception.Message);
    }
}
