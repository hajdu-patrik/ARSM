using AutoService.ApiService.Data;
using AutoService.ApiService.Storage;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AutoService.ApiService.Maintenance;

/**
 * Integrity check for profile pictures held in object storage.
 *
 * This started as the one-off backfill that copied pre-object-storage pictures out of the
 * database. That copy pass is gone: it read {@code people."ProfilePicture"}, and the
 * {@code DropProfilePictureBytes} migration removed that column once the backfill gate reported
 * zero. What remains is the verification pass, which is still worth running on demand, because it
 * is the only check that every persisted object key resolves to a real, non-empty object.
 *
 * It runs inside the API host rather than as a standalone script so it reuses the production
 * {@code IProfilePictureStorage}, and therefore reads the bucket exactly the way the serving path
 * does.
 */
public static class ProfilePictureStorageMigrator
{
    /** Argument that switches the host from serving requests to running the verification pass. */
    public const string CommandArgument = "--migrate-profile-pictures";

    // camelCase keeps the report shape consistent with tests/.artifacts/test-suite-summary.json,
    // which the same tooling reads.
    private static readonly JsonSerializerOptions ReportJsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /**
     * Reports whether the process was started to run the verification instead of the web host.
     *
     * @param args Raw process arguments.
     * @return True when the maintenance command argument is present.
     */
    public static bool IsRequested(string[] args)
        => args.Contains(CommandArgument, StringComparer.Ordinal);

    /**
     * Verifies stored profile pictures and writes a machine-readable report to stdout.
     *
     * @param services Root service provider of the built host.
     * @param cancellationToken Cancellation token.
     * @return Process exit code: 0 when every stored object resolves, 1 when any does not.
     */
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

    /**
     * Confirms every persisted object key resolves to a real, non-empty object.
     *
     * A row whose object is missing or empty is reported rather than thrown, so one broken row
     * never hides the state of the others.
     */
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

        var missing = new List<ProfilePictureMigrationFailure>();

        foreach (var row in stored)
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

        return ProfilePictureMigrationReport.Create("verify", stored.Count, 0, [], missing);
    }
}
