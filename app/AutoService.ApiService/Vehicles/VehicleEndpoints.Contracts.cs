namespace AutoService.ApiService.Vehicles;

public static partial class VehicleEndpoints
{
    internal sealed record VehicleDetailDto(
        int Id,
        string LicensePlate,
        string Vin,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerKw,
        string DrivetrainType,
        CustomerSummaryDto Customer);

    internal sealed record CustomerSummaryDto(
        int Id,
        string FirstName,
        string? MiddleName,
        string LastName);

    internal sealed record CreateVehicleRequest(
        string LicensePlate,
        string Vin,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerKw,
        string DrivetrainType);

    internal sealed record UpdateVehicleRequest(
        string LicensePlate,
        string Vin,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerKw,
        string DrivetrainType);
}
