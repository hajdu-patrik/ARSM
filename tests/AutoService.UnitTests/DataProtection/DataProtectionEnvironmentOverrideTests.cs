using AutoService.ApiService.DataProtection;
using Microsoft.Extensions.Configuration;

namespace AutoService.UnitTests.DataProtection;

/** A non-blank 'DataProtection__*' environment variable wins over configuration; a blank one falls back to it. */
[Collection(DataProtectionEnvironmentCollection.Name)]
public sealed class DataProtectionEnvironmentOverrideTests : IDisposable
{
    private static readonly string[] VariableNames =
    [
        "DataProtection__Provider",
        "DataProtection__KeyDirectory",
        "DataProtection__BlobUri",
        "DataProtection__KeyVaultKeyUri",
        "DataProtection__ManagedIdentityClientId"
    ];

    private readonly Dictionary<string, string?> _originalValues =
        VariableNames.ToDictionary(name => name, Environment.GetEnvironmentVariable);

    public DataProtectionEnvironmentOverrideTests()
    {
        foreach (var name in VariableNames)
        {
            Environment.SetEnvironmentVariable(name, null);
        }
    }

    public void Dispose()
    {
        foreach (var (name, value) in _originalValues)
        {
            Environment.SetEnvironmentVariable(name, value);
        }
    }

    private static IConfiguration Configure(Dictionary<string, string?> values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(v => new KeyValuePair<string, string?>($"DataProtection:{v.Key}", v.Value)))
            .Build();

    [Fact]
    public void An_environment_provider_wins_over_the_configured_one()
    {
        Environment.SetEnvironmentVariable("DataProtection__Provider", "AzureBlob");

        var provider = DataProtectionSettingsResolver.ResolveProvider(Configure(new() { ["Provider"] = "FileSystem" }));

        Assert.Equal(DataProtectionKeyProvider.AzureBlob, provider);
    }

    [Fact]
    public void An_environment_provider_applies_without_any_configuration()
    {
        Environment.SetEnvironmentVariable("DataProtection__Provider", "filesystem");

        Assert.Equal(DataProtectionKeyProvider.FileSystem, DataProtectionSettingsResolver.ResolveProvider(Configure(new())));
    }

    [Fact]
    public void A_blank_environment_provider_falls_back_to_configuration()
    {
        Environment.SetEnvironmentVariable("DataProtection__Provider", "   ");

        Assert.Null(DataProtectionSettingsResolver.ResolveProvider(Configure(new())));
        Assert.Equal(
            DataProtectionKeyProvider.AzureBlob,
            DataProtectionSettingsResolver.ResolveProvider(Configure(new() { ["Provider"] = "AzureBlob" })));
    }

    [Fact]
    public void An_invalid_environment_value_is_not_rescued_by_a_valid_configured_one()
    {
        Environment.SetEnvironmentVariable("DataProtection__KeyDirectory", "relative/keys");
        var configuration = Configure(new() { ["KeyDirectory"] = Path.Combine(Path.GetTempPath(), "arsm-keys") });

        var exception = Assert.Throws<InvalidOperationException>(
            () => DataProtectionSettingsResolver.ResolveFileSystem(configuration));

        Assert.Contains("must be an absolute path", exception.Message);
    }

    [Fact]
    public void Environment_azure_values_win_over_configured_ones()
    {
        const string clientId = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
        Environment.SetEnvironmentVariable("DataProtection__BlobUri", "https://envst.blob.core.windows.net/dp/keys.xml");
        Environment.SetEnvironmentVariable("DataProtection__KeyVaultKeyUri", "https://env-kv.vault.azure.net/keys/dp");
        Environment.SetEnvironmentVariable("DataProtection__ManagedIdentityClientId", clientId);
        var configuration = Configure(new()
        {
            ["BlobUri"] = "https://cfgst.blob.core.windows.net/dp/keys.xml",
            ["KeyVaultKeyUri"] = "https://cfg-kv.vault.azure.net/keys/dp",
            ["ManagedIdentityClientId"] = "0f8fad5b-d9cb-469f-a165-70867728950e"
        });

        var settings = DataProtectionSettingsResolver.ResolveAzureBlob(configuration);

        Assert.Equal(new Uri("https://envst.blob.core.windows.net/dp/keys.xml"), settings.BlobUri);
        Assert.Equal(new Uri("https://env-kv.vault.azure.net/keys/dp"), settings.KeyVaultKeyUri);
        Assert.Equal(clientId, settings.ManagedIdentityClientId);
    }
}
