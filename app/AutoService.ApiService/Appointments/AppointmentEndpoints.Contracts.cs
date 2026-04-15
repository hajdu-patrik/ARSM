/**
 * AppointmentEndpoints.Contracts.cs
 *
 * Auto-generated documentation header for this source file.
 */

namespace AutoService.ApiService.Appointments;

/**
 * Backend type for API logic in this file.
 */
public static partial class AppointmentEndpoints
{
    /**
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record CustomerSummaryDto(
        int Id,
        string FullName,
        string Email);

    /**
 * Immutable DTO used by API request and response flows.
 */
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

    /**
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record MechanicSummaryDto(
        int Id,
        string FullName,
        string Email,
        string Specialization,
        IReadOnlyList<string> Expertise,
        bool HasProfilePicture);

    /**
 * Immutable DTO used by API request and response flows.
 */
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

    /**
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record CreateCustomerAppointmentRequest(
        int VehicleId,
        DateTime ScheduledDate,
        string TaskDescription,
        IReadOnlyList<int> MechanicIds);

    /**
 * Immutable DTO used by API request and response flows.
 */
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

    /**
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record SchedulerNewVehicleRequest(
        string LicensePlate,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerHp,
        int EngineTorqueNm);

    /**
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record UpdateAppointmentRequest(
        DateTime? ScheduledDate,
        DateTime DueDateTime,
        string TaskDescription,
        string LicensePlate,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerHp,
        int EngineTorqueNm);

    /**
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record UpdateStatusRequest(string Status);
}