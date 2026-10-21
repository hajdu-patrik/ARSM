using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Vehicles;

public static partial class VehicleEndpoints
{
    private const int MaxLicensePlateLength = 20;
    private const int MaxBrandLength = 50;
    private const int MaxModelLength = 50;

    private static async Task<IResult> CreateVehicleAsync(
        int customerId,
        CreateVehicleRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.LicensePlate) ||
            string.IsNullOrWhiteSpace(request.Vin) ||
            string.IsNullOrWhiteSpace(request.Brand) ||
            string.IsNullOrWhiteSpace(request.Model) ||
            string.IsNullOrWhiteSpace(request.DrivetrainType))
        {
            return ApiProblem.Unprocessable("LicensePlate, Vin, Brand, Model, and DrivetrainType are required.");
        }

        var lengthValidationError = GetVehicleFieldLengthValidationError(request.LicensePlate, request.Brand, request.Model);
        if (lengthValidationError is not null)
        {
            return ApiProblem.Unprocessable(lengthValidationError);
        }

        var yearError = VehicleNumericValidation.GetYearValidationError(request.Year);
        if (yearError is not null)
        {
            return ApiProblem.Unprocessable(yearError);
        }

        var numericError = VehicleNumericValidation.GetValidationError(request.MileageKm, request.EnginePowerKw);
        if (numericError is not null)
        {
            return ApiProblem.Unprocessable(numericError);
        }

        if (!VinNormalization.TryNormalizeVin(request.Vin, out var normalizedVin, out var vinValidationError))
        {
            return ApiProblem.Unprocessable(vinValidationError);
        }

        if (!VehicleDrivetrainValidation.TryParse(request.DrivetrainType, out var drivetrainType, out var drivetrainValidationError))
        {
            return ApiProblem.Unprocessable(drivetrainValidationError);
        }

        var customerExists = await db.Customers
            .AnyAsync(c => c.Id == customerId, cancellationToken);

        if (!customerExists)
        {
            return ApiProblem.NotFound("Customer not found.");
        }

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(request.LicensePlate, out var plateNormalized, out var plateValidationError))
        {
            return ApiProblem.Unprocessable(plateValidationError);
        }

        var plateExists = await db.Vehicles
            .AnyAsync(v => v.LicensePlate == plateNormalized, cancellationToken);

        if (plateExists)
        {
            return ApiProblem.Conflict("A vehicle with this license plate already exists.");
        }

        var vinExists = await db.Vehicles
            .AnyAsync(v => v.Vin == normalizedVin, cancellationToken);

        if (vinExists)
        {
            return ApiProblem.Conflict("A vehicle with this VIN already exists.");
        }

        var vehicle = new Vehicle(
            plateNormalized,
            normalizedVin,
            request.Brand.Trim(),
            request.Model.Trim(),
            request.Year,
            request.MileageKm,
            request.EnginePowerKw,
            drivetrainType);
        vehicle.CustomerId = customerId;

        db.Vehicles.Add(vehicle);
        await db.SaveChangesAsync(cancellationToken);

        // Load customer for response DTO.
        await db.Entry(vehicle).Reference(v => v.Customer).LoadAsync(cancellationToken);

        var dto = ToVehicleDetailDto(vehicle);

        return Results.Created($"/api/vehicles/{vehicle.Id}", dto);
    }

    private static async Task<IResult> UpdateVehicleAsync(
        int id,
        UpdateVehicleRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.LicensePlate) ||
            string.IsNullOrWhiteSpace(request.Vin) ||
            string.IsNullOrWhiteSpace(request.Brand) ||
            string.IsNullOrWhiteSpace(request.Model) ||
            string.IsNullOrWhiteSpace(request.DrivetrainType))
        {
            return ApiProblem.Unprocessable("LicensePlate, Vin, Brand, Model, and DrivetrainType are required.");
        }

        var lengthValidationError = GetVehicleFieldLengthValidationError(request.LicensePlate, request.Brand, request.Model);
        if (lengthValidationError is not null)
        {
            return ApiProblem.Unprocessable(lengthValidationError);
        }

        var yearError = VehicleNumericValidation.GetYearValidationError(request.Year);
        if (yearError is not null)
        {
            return ApiProblem.Unprocessable(yearError);
        }

        var numericError = VehicleNumericValidation.GetValidationError(request.MileageKm, request.EnginePowerKw);
        if (numericError is not null)
        {
            return ApiProblem.Unprocessable(numericError);
        }

        if (!VinNormalization.TryNormalizeVin(request.Vin, out var normalizedVin, out var vinValidationError))
        {
            return ApiProblem.Unprocessable(vinValidationError);
        }

        if (!VehicleDrivetrainValidation.TryParse(request.DrivetrainType, out var drivetrainType, out var drivetrainValidationError))
        {
            return ApiProblem.Unprocessable(drivetrainValidationError);
        }

        var vehicle = await db.Vehicles
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

        if (vehicle is null)
        {
            return ApiProblem.NotFound("Vehicle not found.");
        }

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(request.LicensePlate, out var plateNormalized, out var plateValidationError))
        {
            return ApiProblem.Unprocessable(plateValidationError);
        }

        var plateConflict = await db.Vehicles
            .AnyAsync(v => v.LicensePlate == plateNormalized && v.Id != id, cancellationToken);

        if (plateConflict)
        {
            return ApiProblem.Conflict("A vehicle with this license plate already exists.");
        }

        var vinConflict = await db.Vehicles
            .AnyAsync(v => v.Vin == normalizedVin && v.Id != id, cancellationToken);

        if (vinConflict)
        {
            return ApiProblem.Conflict("A vehicle with this VIN already exists.");
        }

        vehicle.LicensePlate = plateNormalized;
        vehicle.Vin = normalizedVin;
        vehicle.Brand = request.Brand.Trim();
        vehicle.Model = request.Model.Trim();
        vehicle.Year = request.Year;
        vehicle.MileageKm = request.MileageKm;
        vehicle.EnginePowerKw = request.EnginePowerKw;
        vehicle.DrivetrainType = drivetrainType;

        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> DeleteVehicleAsync(
        int id,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var vehicle = await db.Vehicles
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

        if (vehicle is null)
        {
            return ApiProblem.NotFound("Vehicle not found.");
        }

        db.Vehicles.Remove(vehicle);
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    internal static string? GetVehicleFieldLengthValidationError(
        string licensePlate,
        string brand,
        string model,
        string? fieldPrefix = null)
    {
        var prefix = fieldPrefix ?? string.Empty;

        if (licensePlate.Trim().Length > MaxLicensePlateLength)
        {
            return $"{prefix}LicensePlate must be at most {MaxLicensePlateLength} characters.";
        }

        if (brand.Trim().Length > MaxBrandLength)
        {
            return $"{prefix}Brand must be at most {MaxBrandLength} characters.";
        }

        if (model.Trim().Length > MaxModelLength)
        {
            return $"{prefix}Model must be at most {MaxModelLength} characters.";
        }

        return null;
    }
}
