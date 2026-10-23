using AutoService.ApiService.Vehicles;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** Vehicle DTO with full specifications and the owning customer's identifier. */
    internal sealed record VehicleDto(
        int Id,
        string LicensePlate,
        string Vin,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerKw,
        string DrivetrainType,
        int CustomerId);

    /** Mechanic summary DTO with specialization and profile picture availability. */
    internal sealed record MechanicSummaryDto(
        int Id,
        string FullName,
        string Specialization,
        bool HasProfilePicture);

    /** Full appointment DTO: schedule, status, vehicle, mechanics and the version every edit sends back. */
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
        IReadOnlyList<MechanicSummaryDto> Mechanics,
        uint Version,
        bool HasAcceptedQuote,
        bool CanComplete,
        bool CanDelete,
        bool CanLinkQuote);

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

    internal sealed record SchedulerNewVehicleRequest(
        string LicensePlate,
        string Vin,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerKw,
        string DrivetrainType)
    {
        internal VehicleInput ToInput() => new(LicensePlate, Vin, Brand, Model, Year, MileageKm, EnginePowerKw, DrivetrainType);
    }

    internal sealed record UpdateAppointmentRequest(
        DateTime? ScheduledDate,
        DateTime DueDateTime,
        string TaskDescription,
        uint Version);

    internal sealed record UpdateAppointmentVehicleRequest(
        string LicensePlate,
        string Vin,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerKw,
        string DrivetrainType)
    {
        internal VehicleInput ToInput() => new(LicensePlate, Vin, Brand, Model, Year, MileageKm, EnginePowerKw, DrivetrainType);
    }

    internal sealed record UpdateStatusRequest(string Status, uint Version);
}
