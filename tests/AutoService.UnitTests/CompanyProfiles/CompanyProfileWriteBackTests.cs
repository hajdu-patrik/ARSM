using AutoService.ApiService.CompanyProfiles;
using AutoService.ApiService.Configuration;
using AutoService.UnitTests.Configuration;
using AutoService.UnitTests.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AutoService.UnitTests.CompanyProfiles;

/** The Development-only mirror into the local .env and appsettings.Local.json, on real temp files. */
public sealed class CompanyProfileWriteBackTests : IDisposable
{
    private static readonly CompanyProfile Profile =
        new("New Kft.", "Fo utca 2.", "2222", "Gyor", "11111111-1-11", "+36304445566", "new@example.test");

    private const string LocalJson = "{\n  \"CompanyProfile\": {\n    \"Name\": \"Old\",\n    \"City\": \"Old\"\n  }\n}";

    private readonly string directory = Path.Combine(Path.GetTempPath(), $"arsm-writeback-{Guid.NewGuid():N}");
    private readonly RecordingLogger<CompanyProfileWriteBack> log = new();

    public CompanyProfileWriteBackTests() => Directory.CreateDirectory(directory);

    public void Dispose() => Directory.Delete(directory, recursive: true);

    private string PathOf(string name) => Path.Combine(directory, name);

    private CompanyProfileWriteBack Create(string environment, string? envFile, string? localFile) => new(
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["CompanyProfile:WriteBack:EnvFilePath"] = envFile,
            ["CompanyProfile:WriteBack:LocalSettingsPath"] = localFile,
        }).Build(),
        new FakeHostEnvironment(environment),
        log);

    [Fact]
    public async Task In_development_both_files_are_rewritten_with_the_saved_profile()
    {
        File.WriteAllText(PathOf(".env"), "A=1\n");
        File.WriteAllText(PathOf("local.json"), LocalJson);

        await Create(Environments.Development, PathOf(".env"), PathOf("local.json")).WriteAsync(Profile, CancellationToken.None);

        var env = File.ReadAllText(PathOf(".env"));
        Assert.StartsWith("A=1\n", env);
        Assert.Contains("ARSM_COMPANY_NAME=New Kft.\n", env);
        Assert.Contains("ARSM_COMPANY_EMAIL=new@example.test\n", env);
        var json = File.ReadAllText(PathOf("local.json"));
        Assert.Contains("\"Name\": \"New Kft.\"", json);
        Assert.Contains("\"City\": \"Gyor\"", json);
        Assert.Empty(log.Entries);
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public async Task Outside_development_no_file_is_touched(string environment)
    {
        File.WriteAllText(PathOf(".env"), "A=1\n");
        File.WriteAllText(PathOf("local.json"), LocalJson);

        await Create(environment, PathOf(".env"), PathOf("local.json")).WriteAsync(Profile, CancellationToken.None);

        Assert.Equal("A=1\n", File.ReadAllText(PathOf(".env")));
        Assert.Equal(LocalJson, File.ReadAllText(PathOf("local.json")));
        Assert.Empty(log.Entries);
    }

    [Fact]
    public async Task A_missing_path_setting_or_file_is_skipped_with_an_information_entry_per_file_and_nothing_is_created()
    {
        await Create(Environments.Development, null, PathOf("absent.json")).WriteAsync(Profile, CancellationToken.None);

        Assert.Equal(2, log.Entries.Count);
        Assert.All(log.Entries, entry => Assert.Equal(LogLevel.Information, entry.Level));
        Assert.Contains("EnvFilePath", log.Entries[0].Message);
        Assert.Contains("LocalSettingsPath", log.Entries[1].Message);
        Assert.False(File.Exists(PathOf("absent.json")));
    }

    [Fact]
    public async Task A_file_that_already_matches_is_not_written_again()
    {
        var writeBack = Create(Environments.Development, PathOf(".env"), null);
        File.WriteAllText(PathOf(".env"), "A=1\n");
        await writeBack.WriteAsync(Profile, CancellationToken.None);
        var stamp = new DateTime(2001, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        File.SetLastWriteTimeUtc(PathOf(".env"), stamp);

        await writeBack.WriteAsync(Profile, CancellationToken.None);

        Assert.Equal(stamp, File.GetLastWriteTimeUtc(PathOf(".env")));
    }

    [Fact]
    public async Task A_malformed_settings_file_is_left_alone_and_logged_as_a_warning_by_type_only()
    {
        const string broken = "{ \"CompanyProfile\": { \"Name\": ";
        File.WriteAllText(PathOf("local.json"), broken);

        await Create(Environments.Development, null, PathOf("local.json")).WriteAsync(Profile, CancellationToken.None);

        Assert.Equal(broken, File.ReadAllText(PathOf("local.json")));
        var warning = Assert.Single(log.Entries, entry => entry.Level == LogLevel.Warning);
        Assert.StartsWith("Company profile write-back failed for CompanyProfile:WriteBack:LocalSettingsPath (Json", warning.Message);
    }

    [Fact]
    public async Task A_locked_file_is_logged_as_a_warning_and_never_fails_the_save()
    {
        File.WriteAllText(PathOf(".env"), "A=1\n");
        using var lockHandle = new FileStream(PathOf(".env"), FileMode.Open, FileAccess.ReadWrite, FileShare.None);

        await Create(Environments.Development, PathOf(".env"), null).WriteAsync(Profile, CancellationToken.None);

        var warning = Assert.Single(log.Entries, entry => entry.Level == LogLevel.Warning);
        Assert.Equal("Company profile write-back failed for CompanyProfile:WriteBack:EnvFilePath (IOException).", warning.Message);
    }
}
