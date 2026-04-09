namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    internal sealed record CustomerSummaryDto(
        int Id,
        string FullName,
        string Email);

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

    internal sealed record MechanicSummaryDto(
        int Id,
        string FullName,
        string Email,
        string Specialization,
        IReadOnlyList<string> Expertise,
        bool HasProfilePicture);

    internal sealed record AppointmentDto(
        int Id,
        DateTime ScheduledDate,
        string TaskDescription,
        string Status,
        DateTime? CompletedAt,
        DateTime? CanceledAt,
        VehicleDto Vehicle,
        IReadOnlyList<MechanicSummaryDto> Mechanics);

    internal sealed record CreateCustomerAppointmentRequest(
        int VehicleId,
        DateTime ScheduledDate,
        string TaskDescription,
        IReadOnlyList<int> MechanicIds);

    internal sealed record UpdateStatusRequest(string Status);
}