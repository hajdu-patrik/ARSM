/**
 * VehicleEndpoints.Contracts.cs
 *
 * Auto-generated documentation header for this source file.
 */

namespace AutoService.ApiService.Vehicles;

/**
 * Backend type for API logic in this file.
 */
public static partial class VehicleEndpoints
{
    /**
 * Immutable DTO used by API request and response flows.
 */
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

    /**
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record CustomerSummaryDto(
        int Id,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email);

    /**
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record CreateVehicleRequest(
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
    internal sealed record UpdateVehicleRequest(
        string LicensePlate,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerHp,
        int EngineTorqueNm);
}
