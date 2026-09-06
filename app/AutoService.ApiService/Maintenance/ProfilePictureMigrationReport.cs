namespace AutoService.ApiService.Maintenance;

/**
 * A single row a profile-picture migration pass could not process.
 *
 * Only the person id is recorded; names, emails, and picture contents never enter the report,
 * because the report is written to disk and read by tooling.
 *
 * @param PersonId Identifier of the affected person row.
 * @param Reason Short, person-agnostic failure description.
 */
public sealed record ProfilePictureMigrationFailure(int PersonId, string Reason);

/**
 * Machine-readable result of one profile-picture migration pass.
 *
 * Mirrors the shape the local test runner writes, so the wrapper script can hand it to tooling
 * without reshaping it. {@code Migrated} and {@code Failed} are kept at zero and empty by the
 * verification pass; they remain in the shape so a report stays comparable with the ones the
 * removed backfill pass wrote.
 *
 * @param SchemaVersion Report format version.
 * @param Mode Which pass produced this report. Only "verify" is produced today; historical reports written by the removed backfill may still contain "dry-run" or "migrate".
 * @param OverallStatus "passed" when nothing failed, otherwise "failed".
 * @param Candidates Rows the pass examined.
 * @param Migrated Rows successfully copied to object storage.
 * @param Failed Rows that could not be processed.
 * @param MissingObjects Rows whose stored object key does not resolve to a usable object.
 */
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

    /**
     * Builds a report and derives the overall status from the collected problems.
     *
     * @param mode Which pass produced this report.
     * @param candidates Rows the pass examined.
     * @param migrated Rows successfully copied to object storage.
     * @param failed Rows that could not be processed.
     * @param missingObjects Rows whose stored object key does not resolve to a usable object.
     * @return A report whose overall status is "passed" only when both {@code failed} and {@code missingObjects} are empty.
     */
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
