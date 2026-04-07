namespace AutoService.ApiService.Vehicles;

public static partial class VehicleEndpoints
{
    internal sealed record VehicleDetailDto(
        int Id,
        string LicensePlate,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerHp,
        int EngineTorqueNm,
        CustomerSummaryDto Customer);

    internal sealed record CustomerSummaryDto(
        int Id,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email);

    internal sealed record CreateVehicleRequest(
        string LicensePlate,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerHp,
        int EngineTorqueNm);

    internal sealed record UpdateVehicleRequest(
        string LicensePlate,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerHp,
        int EngineTorqueNm);
}
