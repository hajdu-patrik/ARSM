using AutoService.ApiService.DataProtection;
using Microsoft.Extensions.Configuration;

namespace AutoService.UnitTests.DataProtection;

/** The FileSystem provider needs a fully qualified key directory; resolving never touches the disk. */
[Collection(DataProtectionEnvironmentCollection.Name)]
public sealed class FileSystemDataProtectionSettingsTests
{
    private static IConfiguration Configure(string? keyDirectory) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DataProtection:Provider"] = "FileSystem",
                ["DataProtection:KeyDirectory"] = keyDirectory
            })
            .Build();

    [Fact]
    public void A_valid_absolute_key_directory_resolves_without_creating_it()
    {
        var keyDirectory = Path.Combine(Path.GetTempPath(), $"arsm-dataprotection-{Guid.NewGuid():N}");

        var settings = DataProtectionSettingsResolver.ResolveFileSystem(Configure(keyDirectory));

        Assert.Equal(keyDirectory, settings.KeyDirectory);
        Assert.False(Directory.Exists(keyDirectory));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void A_missing_or_blank_key_directory_throws(string? keyDirectory)
    {
        var exception = Assert.Throws<InvalidOperationException>(
            () => DataProtectionSettingsResolver.ResolveFileSystem(Configure(keyDirectory)));

        Assert.Contains("DataProtection:KeyDirectory", exception.Message);
        Assert.Contains("missing or blank", exception.Message);
    }

    [Theory]
    [InlineData("keys")]
    [InlineData("./keys")]
    [InlineData("../dataprotection/keys")]
    public void A_relative_key_directory_throws_without_echoing_it(string keyDirectory)
    {
        var exception = Assert.Throws<InvalidOperationException>(
            () => DataProtectionSettingsResolver.ResolveFileSystem(Configure(keyDirectory)));

        Assert.Contains("DataProtection:KeyDirectory", exception.Message);
        Assert.Contains("must be an absolute path", exception.Message);
        Assert.DoesNotContain(keyDirectory, exception.Message);
    }

    [Fact]
    public void A_template_marker_key_directory_throws_without_echoing_it()
    {
        var keyDirectory = Path.Combine(Path.GetTempPath(), "CHANGE_ME");

        var exception = Assert.Throws<InvalidOperationException>(
            () => DataProtectionSettingsResolver.ResolveFileSystem(Configure(keyDirectory)));

        Assert.Contains("template placeholder marker", exception.Message);
        Assert.DoesNotContain(keyDirectory, exception.Message);
    }
}
