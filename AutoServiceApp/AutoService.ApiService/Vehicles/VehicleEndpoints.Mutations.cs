using AutoService.ApiService.Common;
using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using Microsoft.EntityFrameworkCore;

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
            string.IsNullOrWhiteSpace(request.Brand) ||
            string.IsNullOrWhiteSpace(request.Model))
        {
            return Results.Problem(
                detail: "LicensePlate, Brand, and Model are required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var lengthValidationError = GetVehicleFieldLengthValidationError(request.LicensePlate, request.Brand, request.Model);
        if (lengthValidationError is not null)
        {
            return Results.Problem(
                detail: lengthValidationError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.Year < 1886 || request.Year > 2100)
        {
            return Results.Problem(
                detail: "Year must be between 1886 and 2100.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.MileageKm < 0 || request.EnginePowerHp < 0 || request.EngineTorqueNm < 0)
        {
            return Results.Problem(
                detail: "MileageKm, EnginePowerHp, and EngineTorqueNm must be non-negative.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var customerExists = await db.Customers
            .AnyAsync(c => c.Id == customerId, cancellationToken);

        if (!customerExists)
        {
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(request.LicensePlate, out var plateNormalized, out var plateValidationError))
        {
            return Results.Problem(
                detail: plateValidationError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var plateExists = await db.Vehicles
            .AnyAsync(v => v.LicensePlate == plateNormalized, cancellationToken);

        if (plateExists)
        {
            return Results.Problem(
                detail: "A vehicle with this license plate already exists.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var vehicle = new Vehicle(
            plateNormalized,
            request.Brand.Trim(),
            request.Model.Trim(),
            request.Year,
            request.MileageKm,
            request.EnginePowerHp,
            request.EngineTorqueNm);
        vehicle.CustomerId = customerId;

        db.Vehicles.Add(vehicle);
        await db.SaveChangesAsync(cancellationToken);

        // Load customer for response DTO.
        await db.Entry(vehicle).Reference(v => v.Customer).LoadAsync(cancellationToken);

        var dto = new VehicleDetailDto(
            vehicle.Id,
            vehicle.LicensePlate,
            vehicle.Brand,
            vehicle.Model,
            vehicle.Year,
            vehicle.MileageKm,
            vehicle.EnginePowerHp,
            vehicle.EngineTorqueNm,
            new CustomerSummaryDto(
                vehicle.Customer.Id,
                vehicle.Customer.Name.FirstName,
                vehicle.Customer.Name.MiddleName,
                vehicle.Customer.Name.LastName,
                vehicle.Customer.Email));

        return Results.Created($"/api/vehicles/{vehicle.Id}", dto);
    }

    private static async Task<IResult> UpdateVehicleAsync(
        int id,
        UpdateVehicleRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.LicensePlate) ||
            string.IsNullOrWhiteSpace(request.Brand) ||
            string.IsNullOrWhiteSpace(request.Model))
        {
            return Results.Problem(
                detail: "LicensePlate, Brand, and Model are required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var lengthValidationError = GetVehicleFieldLengthValidationError(request.LicensePlate, request.Brand, request.Model);
        if (lengthValidationError is not null)
        {
            return Results.Problem(
                detail: lengthValidationError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.Year < 1886 || request.Year > 2100)
        {
            return Results.Problem(
                detail: "Year must be between 1886 and 2100.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.MileageKm < 0 || request.EnginePowerHp < 0 || request.EngineTorqueNm < 0)
        {
            return Results.Problem(
                detail: "MileageKm, EnginePowerHp, and EngineTorqueNm must be non-negative.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var vehicle = await db.Vehicles
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

        if (vehicle is null)
        {
            return Results.Problem(
                detail: "Vehicle not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(request.LicensePlate, out var plateNormalized, out var plateValidationError))
        {
            return Results.Problem(
                detail: plateValidationError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var plateConflict = await db.Vehicles
            .AnyAsync(v => v.LicensePlate == plateNormalized && v.Id != id, cancellationToken);

        if (plateConflict)
        {
            return Results.Problem(
                detail: "A vehicle with this license plate already exists.",
                statusCode: StatusCodes.Status409Conflict);
        }

        vehicle.LicensePlate = plateNormalized;
        vehicle.Brand = request.Brand.Trim();
        vehicle.Model = request.Model.Trim();
        vehicle.Year = request.Year;
        vehicle.MileageKm = request.MileageKm;
        vehicle.EnginePowerHp = request.EnginePowerHp;
        vehicle.EngineTorqueNm = request.EngineTorqueNm;

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
            return Results.Problem(
                detail: "Vehicle not found.",
                statusCode: StatusCodes.Status404NotFound);
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
