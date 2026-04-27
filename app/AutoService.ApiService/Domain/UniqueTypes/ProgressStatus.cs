namespace AutoService.ApiService.Domain.UniqueTypes;

public enum ProgressStatus
{
    InProgress, // Vehicle is currently being serviced.
    Completed,  // Service work finished successfully.
    Cancelled   // Appointment was cancelled before or during service.
}