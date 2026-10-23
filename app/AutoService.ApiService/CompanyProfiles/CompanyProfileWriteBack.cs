using System.Text;
using System.Text.Json;
using AutoService.ApiService.Configuration;

namespace AutoService.ApiService.CompanyProfiles;

/** Development-only mirror of the saved letterhead into the local .env and appsettings.Local.json. */
public sealed class CompanyProfileWriteBack(
    IConfiguration configuration,
    IHostEnvironment environment,
    ILogger<CompanyProfileWriteBack> logger) : ICompanyProfileWriteBack
{
    private const string EnvFilePathKey = "CompanyProfile:WriteBack:EnvFilePath";
    private const string LocalSettingsPathKey = "CompanyProfile:WriteBack:LocalSettingsPath";

    private static readonly UTF8Encoding Utf8 = new(encoderShouldEmitUTF8Identifier: false);

    public async Task WriteAsync(CompanyProfile profile, CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
        {
            return;
        }

        var envValues = CompanyProfileEnvValues.From(profile);
        await RewriteFileAsync(EnvFilePathKey, content => EnvFileRewriter.Rewrite(content, envValues), cancellationToken);
        await RewriteFileAsync(LocalSettingsPathKey, json => LocalSettingsRewriter.Rewrite(json, profile), cancellationToken);
    }

    private async Task RewriteFileAsync(string pathKey, Func<string, string> rewrite, CancellationToken cancellationToken)
    {
        var path = configuration[pathKey];
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            logger.LogInformation("Company profile write-back skipped: {PathKey} is not set or the file does not exist.", pathKey);
            return;
        }

        try
        {
            var original = Utf8.GetString(await File.ReadAllBytesAsync(path, cancellationToken));
            var updated = rewrite(original);
            if (!string.Equals(original, updated, StringComparison.Ordinal))
            {
                await File.WriteAllBytesAsync(path, Utf8.GetBytes(updated), cancellationToken);
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
        {
            logger.LogWarning("Company profile write-back failed for {PathKey} ({ErrorType}).", pathKey, ex.GetType().Name);
        }
    }
}
