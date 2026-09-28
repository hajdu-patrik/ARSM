using AutoService.ApiService.Data;
using AutoService.ApiService.Storage;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using System.Text.Json;

namespace AutoService.ApiService.Maintenance;

// Verifies that every persisted profile-picture object key resolves to a real, non-empty object.
// Runs inside the API host (not a standalone script) to reuse the production IProfilePictureStorage.
public static class ProfilePictureStorageMigrator
{
    // Argument that switches the host from serving requests to running the verification pass.
    public const string CommandArgument = "--migrate-profile-pictures";

    // Upper bound on in-flight object storage lookups while verifying stored profile pictures.
    private const int MaxConcurrentVerifications = 10;

    // camelCase keeps the report shape consistent with tests/.artifacts/test-suite-summary.json,
    // which the same tooling reads.
    private static readonly JsonSerializerOptions ReportJsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    // Reports whether the process was started to run the verification instead of the web host.
    // args: raw process arguments. Returns true when the maintenance command argument is present.
    public static bool IsRequested(string[] args)
        => args.Contains(CommandArgument, StringComparer.Ordinal);

    // Verifies stored profile pictures and writes a machine-readable report to stdout;
    // exit code is 0 when every stored object resolves, 1 when any does not.
    public static async Task<int> RunAsync(
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoServiceDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IProfilePictureStorage>();

        var report = await VerifyAsync(db, storage, cancellationToken);

        Console.WriteLine(JsonSerializer.Serialize(report, ReportJsonOptions));

        return report.OverallStatus == "passed" ? 0 : 1;
    }

    // Confirms every persisted object key resolves to a real, non-empty object; a missing/empty
    // object is reported rather than thrown, so one broken row never hides the others' state.
    private static async Task<ProfilePictureMigrationReport> VerifyAsync(
        AutoServiceDbContext db,
        IProfilePictureStorage storage,
        CancellationToken cancellationToken)
    {
        var stored = await db.People
            .AsNoTracking()
            .Where(person => person.ProfilePictureObjectKey != null)
            .Select(person => new { person.Id, ObjectKey = person.ProfilePictureObjectKey! })
            .ToListAsync(cancellationToken);

        var missing = new ConcurrentBag<ProfilePictureMigrationFailure>();

        using (var throttle = new SemaphoreSlim(MaxConcurrentVerifications))
        {
            var verifications = stored.Select(async row =>
            {
                await throttle.WaitAsync(cancellationToken);

                try
                {
                    var size = await storage.GetObjectSizeAsync(row.ObjectKey, cancellationToken);

                    if (size is null)
                    {
                        missing.Add(new ProfilePictureMigrationFailure(row.Id, "Object is missing from the bucket."));
                    }
                    else if (size == 0)
                    {
                        missing.Add(new ProfilePictureMigrationFailure(row.Id, "Object exists but is empty."));
                    }
                }
                finally
                {
                    throttle.Release();
                }
            });

            await Task.WhenAll(verifications);
        }

        return ProfilePictureMigrationReport.Create("verify", stored.Count, 0, [], [.. missing]);
    }
}
