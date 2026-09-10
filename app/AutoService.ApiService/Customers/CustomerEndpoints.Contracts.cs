namespace AutoService.ApiService.Customers;

public static partial class CustomerEndpoints
{
    internal sealed record CustomerDto(
        int Id,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber,
        int VehicleCount,
        IReadOnlyList<string> VehicleLicensePlates);

    internal sealed record CreateCustomerRequest(
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber);

    internal sealed record UpdateCustomerRequest(
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber);

    // Extended DTO for single-customer retrieval (includes vehicles).
    internal sealed record CustomerWithVehiclesDto(
        int Id,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber,
        IReadOnlyList<VehicleSummaryDto> Vehicles);

    internal sealed record VehicleSummaryDto(
        int Id,
        string LicensePlate,
        string Brand,
        string Model,
        int Year);

    /** Scheduler customer lookup payload with optional matched vehicle context. */
    internal sealed record SchedulerCustomerLookupDto(
        int Id,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber,
        IReadOnlyList<SchedulerVehicleLookupDto> Vehicles,
        int? MatchedVehicleId = null);

    /** Vehicle summary payload used by scheduler customer lookup responses. */
    internal sealed record SchedulerVehicleLookupDto(
        int Id,
        string LicensePlate,
        string Vin,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerKw,
        string DrivetrainType);
}
