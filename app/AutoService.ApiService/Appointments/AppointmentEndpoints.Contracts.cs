namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** Customer summary DTO with minimal identification details. */
    internal sealed record CustomerSummaryDto(
        int Id,
        string FullName);

    /** Vehicle DTO with full specifications and owner details. */
    internal sealed record VehicleDto(
        int Id,
        string LicensePlate,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerHp,
        int EngineTorqueNm,
        CustomerSummaryDto Customer);

    /** Mechanic summary DTO with specialization and profile picture availability. */
    internal sealed record MechanicSummaryDto(
        int Id,
        string FullName,
        string Specialization,
        bool HasProfilePicture);

    /** Full appointment DTO with scheduling details, status, vehicle, and assigned mechanics. */
    internal sealed record AppointmentDto(
        int Id,
        DateTime ScheduledDate,
        DateTime IntakeCreatedAt,
        DateTime DueDateTime,
        string TaskDescription,
        string Status,
        DateTime? CompletedAt,
        DateTime? CanceledAt,
        VehicleDto Vehicle,
        IReadOnlyList<MechanicSummaryDto> Mechanics);

    /** Request payload for creating a customer appointment via admin endpoint. */
    internal sealed record CreateCustomerAppointmentRequest(
        int VehicleId,
        DateTime ScheduledDate,
        string TaskDescription,
        IReadOnlyList<int> MechanicIds);

    /** Scheduler intake creation request with customer lookup/creation and vehicle linkage. */
    internal sealed record SchedulerCreateIntakeRequest(
        string CustomerEmail,
        string? CustomerFirstName,
        string? CustomerMiddleName,
        string? CustomerLastName,
        string? CustomerPhoneNumber,
        int? VehicleId,
        SchedulerNewVehicleRequest? Vehicle,
        DateTime ScheduledDate,
        DateTime DueDateTime,
        string TaskDescription,
        string? Status);

    /** New vehicle payload nested within scheduler intake request. */
    internal sealed record SchedulerNewVehicleRequest(
        string LicensePlate,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerHp,
        int EngineTorqueNm);

    /** Request payload for updating appointment scheduling and task details. */
    internal sealed record UpdateAppointmentRequest(
        DateTime? ScheduledDate,
        DateTime DueDateTime,
        string TaskDescription);

    /** Request payload for updating vehicle details linked to an appointment. */
    internal sealed record UpdateAppointmentVehicleRequest(
        string LicensePlate,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerHp,
        int EngineTorqueNm);

    /** Request payload for updating appointment lifecycle status. */
    internal sealed record UpdateStatusRequest(string Status);
}