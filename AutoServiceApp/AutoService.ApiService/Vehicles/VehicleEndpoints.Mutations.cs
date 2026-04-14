/**
 * VehicleEndpoints.Mutations.cs
 *
 * Auto-generated documentation header for this source file.
 */

using AutoService.ApiService.Identity;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Vehicles;

/**
 * Backend type for API logic in this file.
 */
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

        var yearError = VehicleNumericValidation.GetYearValidationError(request.Year);
        if (yearError is not null)
        {
            return Results.Problem(detail: yearError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var numericError = VehicleNumericValidation.GetValidationError(request.MileageKm, request.EnginePowerHp, request.EngineTorqueNm);
        if (numericError is not null)
        {
            return Results.Problem(detail: numericError, statusCode: StatusCodes.Status422UnprocessableEntity);
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

        var yearError = VehicleNumericValidation.GetYearValidationError(request.Year);
        if (yearError is not null)
        {
            return Results.Problem(detail: yearError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var numericError = VehicleNumericValidation.GetValidationError(request.MileageKm, request.EnginePowerHp, request.EngineTorqueNm);
        if (numericError is not null)
        {
            return Results.Problem(detail: numericError, statusCode: StatusCodes.Status422UnprocessableEntity);
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
