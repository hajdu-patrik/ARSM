using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Vehicles;

/** The vehicle fields every vehicle write accepts (vehicle create and update, appointment vehicle edit,
    intake), with the checks and mapping those four handlers share. */
internal readonly record struct VehicleInput(
    string LicensePlate,
    string Vin,
    string Brand,
    string Model,
    int Year,
    int MileageKm,
    int EnginePowerKw,
    string DrivetrainType)
{
    private const int MaxLicensePlateLength = 20;
    private const int MaxBrandLength = 50;
    private const int MaxModelLength = 50;

    /** Required, length, year and numeric checks in that order; the prefix names a nested payload ("Vehicle."). */
    internal string? GetFieldError(string prefix = "")
    {
        if (string.IsNullOrWhiteSpace(LicensePlate) ||
            string.IsNullOrWhiteSpace(Vin) ||
            string.IsNullOrWhiteSpace(Brand) ||
            string.IsNullOrWhiteSpace(Model) ||
            string.IsNullOrWhiteSpace(DrivetrainType))
        {
            return $"{prefix}LicensePlate, {prefix}Vin, {prefix}Brand, {prefix}Model, and {prefix}DrivetrainType are required.";
        }

        if (LicensePlate.Trim().Length > MaxLicensePlateLength)
        {
            return $"{prefix}LicensePlate must be at most {MaxLicensePlateLength} characters.";
        }

        if (Brand.Trim().Length > MaxBrandLength)
        {
            return $"{prefix}Brand must be at most {MaxBrandLength} characters.";
        }

        if (Model.Trim().Length > MaxModelLength)
        {
            return $"{prefix}Model must be at most {MaxModelLength} characters.";
        }

        return VehicleNumericValidation.GetYearValidationError(Year, prefix)
            ?? VehicleNumericValidation.GetValidationError(MileageKm, EnginePowerKw, prefix);
    }

    internal Vehicle ToEntity(string normalizedPlate, string normalizedVin, DrivetrainType drivetrainType) => new(
        normalizedPlate,
        normalizedVin,
        Brand.Trim(),
        Model.Trim(),
        Year,
        MileageKm,
        EnginePowerKw,
        drivetrainType);

    internal void ApplyTo(Vehicle vehicle, string normalizedPlate, string normalizedVin, DrivetrainType drivetrainType)
    {
        vehicle.LicensePlate = normalizedPlate;
        vehicle.Vin = normalizedVin;
        vehicle.Brand = Brand.Trim();
        vehicle.Model = Model.Trim();
        vehicle.Year = Year;
        vehicle.MileageKm = MileageKm;
        vehicle.EnginePowerKw = EnginePowerKw;
        vehicle.DrivetrainType = drivetrainType;
    }

    /** The 409 detail when another vehicle already holds the plate or, checked second, the VIN. */
    internal static async Task<string?> FindUniquenessConflictAsync(
        AutoServiceDbContext db,
        string normalizedPlate,
        string normalizedVin,
        int? excludeVehicleId,
        CancellationToken cancellationToken)
    {
        IQueryable<Vehicle> others = db.Vehicles;
        if (excludeVehicleId is int id)
        {
            others = others.Where(v => v.Id != id);
        }

        if (await others.AnyAsync(v => v.LicensePlate == normalizedPlate, cancellationToken))
        {
            return "A vehicle with this license plate already exists.";
        }

        return await others.AnyAsync(v => v.Vin == normalizedVin, cancellationToken)
            ? "A vehicle with this VIN already exists."
            : null;
    }
}
