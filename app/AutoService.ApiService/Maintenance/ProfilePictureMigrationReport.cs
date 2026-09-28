namespace AutoService.ApiService.Maintenance;

/** A single row a profile-picture migration pass could not process. Only the person id is recorded; names, emails, and picture contents never enter the report, because the report is written to disk and read by tooling. */
public sealed record ProfilePictureMigrationFailure(int PersonId, string Reason);

/** Machine-readable result of one migration pass, matching the shape the local test runner writes
    so tooling needs no reshaping; {@code Migrated}/{@code Failed} stay zero/empty (kept from the removed backfill pass). */
public sealed record ProfilePictureMigrationReport(
    int SchemaVersion,
    string Mode,
    string OverallStatus,
    int Candidates,
    int Migrated,
    IReadOnlyList<ProfilePictureMigrationFailure> Failed,
    IReadOnlyList<ProfilePictureMigrationFailure> MissingObjects)
{
    private const int CurrentSchemaVersion = 1;

    /** Builds a report and derives the overall status from the collected problems. */
    public static ProfilePictureMigrationReport Create(
        string mode,
        int candidates,
        int migrated,
        IReadOnlyList<ProfilePictureMigrationFailure> failed,
        IReadOnlyList<ProfilePictureMigrationFailure> missingObjects)
    {
        var status = failed.Count == 0 && missingObjects.Count == 0
            ? "passed"
            : "failed";

        return new ProfilePictureMigrationReport(
            CurrentSchemaVersion,
            mode,
            status,
            candidates,
            migrated,
            failed,
            missingObjects);
    }
}
