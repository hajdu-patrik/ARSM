using AutoService.ApiService.DataProtection;
using Microsoft.Extensions.Configuration;

namespace AutoService.UnitTests.DataProtection;

/** An absent provider keeps the framework default key ring; any present value must name a known provider. */
[Collection(DataProtectionEnvironmentCollection.Name)]
public sealed class DataProtectionProviderResolutionTests
{
    private static IConfiguration Configure(string? provider) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["DataProtection:Provider"] = provider })
            .Build();

    [Fact]
    public void An_absent_provider_resolves_to_null()
    {
        Assert.Null(DataProtectionSettingsResolver.ResolveProvider(new ConfigurationBuilder().Build()));
        Assert.Null(DataProtectionSettingsResolver.ResolveProvider(Configure(null)));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void A_blank_provider_throws(string provider)
    {
        var exception = Assert.Throws<InvalidOperationException>(
            () => DataProtectionSettingsResolver.ResolveProvider(Configure(provider)));

        Assert.Contains("DataProtection:Provider", exception.Message);
        Assert.Contains("missing or blank", exception.Message);
    }

    [Theory]
    [InlineData("change-me-provider")]
    [InlineData("SET_UNIQUE_LOCAL_provider")]
    public void A_template_marker_provider_throws_without_echoing_it(string provider)
    {
        var exception = Assert.Throws<InvalidOperationException>(
            () => DataProtectionSettingsResolver.ResolveProvider(Configure(provider)));

        Assert.Contains("DataProtection:Provider", exception.Message);
        Assert.Contains("template placeholder marker", exception.Message);
        Assert.DoesNotContain(provider, exception.Message);
    }

    [Theory]
    [InlineData("Redis")]
    [InlineData("File System")]
    [InlineData("AzureBlobs")]
    public void An_unknown_provider_throws_without_echoing_it(string provider)
    {
        var exception = Assert.Throws<InvalidOperationException>(
            () => DataProtectionSettingsResolver.ResolveProvider(Configure(provider)));

        Assert.Contains("must be 'FileSystem' or 'AzureBlob'", exception.Message);
        Assert.DoesNotContain(provider, exception.Message);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("1")]
    [InlineData("-1")]
    public void A_numeric_provider_throws(string provider)
    {
        Assert.Throws<InvalidOperationException>(
            () => DataProtectionSettingsResolver.ResolveProvider(Configure(provider)));
    }

    [Theory]
    [InlineData("FileSystem", "FileSystem")]
    [InlineData("filesystem", "FileSystem")]
    [InlineData(" FILESYSTEM ", "FileSystem")]
    [InlineData("AzureBlob", "AzureBlob")]
    [InlineData("azureblob", "AzureBlob")]
    [InlineData("AZUREBLOB", "AzureBlob")]
    public void A_valid_provider_resolves_case_insensitively(string provider, string expected)
    {
        Assert.Equal(Enum.Parse<DataProtectionKeyProvider>(expected), DataProtectionSettingsResolver.ResolveProvider(Configure(provider)));
    }
}
