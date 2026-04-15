/**
 * ProgresStatus.cs
 *
 * Auto-generated documentation header for this source file.
 */

namespace AutoService.ApiService.Domain.UniqueTypes;

/**
 * Tracks the lifecycle state of a service appointment.
 * Persisted to the database as a string via EF Core value conversion.
 */
public enum ProgresStatus
{
    InProgress, // Vehicle is currently being serviced.
    Completed,  // Service work finished successfully.
    Cancelled   // Appointment was cancelled before or during service.
}