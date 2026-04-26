namespace AutoService.ApiService.Domain.UniqueTypes;

// Known typo: should be "ProgressStatus". Renaming would require a breaking migration
// and full schema rebuild. Tracked as intentional tech debt — rename in a future v2.0 migration.
public enum ProgresStatus
{
    InProgress, // Vehicle is currently being serviced.
    Completed,  // Service work finished successfully.
    Cancelled   // Appointment was cancelled before or during service.
}