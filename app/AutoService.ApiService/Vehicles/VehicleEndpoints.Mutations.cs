using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Identity;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Vehicles;

public static partial class VehicleEndpoints
{
    private static async Task<IResult> CreateVehicleAsync(
        int customerId,
        CreateVehicleRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var input = request.ToInput();
        var fieldError = input.GetFieldError();
        if (fieldError is not null)
        {
            return ApiProblem.Unprocessable(fieldError);
        }

        if (!VinNormalization.TryNormalizeVin(input.Vin, out var normalizedVin, out var vinValidationError))
        {
            return ApiProblem.Unprocessable(vinValidationError);
        }

        if (!VehicleDrivetrainValidation.TryParse(input.DrivetrainType, out var drivetrainType, out var drivetrainValidationError))
        {
            return ApiProblem.Unprocessable(drivetrainValidationError);
        }

        if (!await db.Customers.AnyAsync(c => c.Id == customerId, cancellationToken))
        {
            return ApiProblem.NotFound("Customer not found.");
        }

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(input.LicensePlate, out var plateNormalized, out var plateValidationError))
        {
            return ApiProblem.Unprocessable(plateValidationError);
        }

        var conflict = await VehicleInput.FindUniquenessConflictAsync(db, plateNormalized, normalizedVin, null, cancellationToken);
        if (conflict is not null)
        {
            return ApiProblem.Conflict(conflict);
        }

        var vehicle = input.ToEntity(plateNormalized, normalizedVin, drivetrainType);
        vehicle.CustomerId = customerId;

        db.Vehicles.Add(vehicle);
        await db.SaveChangesAsync(cancellationToken);

        // Load customer for response DTO.
        await db.Entry(vehicle).Reference(v => v.Customer).LoadAsync(cancellationToken);

        return Results.Created($"/api/vehicles/{vehicle.Id}", ToVehicleDetailDto(vehicle));
    }

    private static async Task<IResult> UpdateVehicleAsync(
        int id,
        UpdateVehicleRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var input = request.ToInput();
        var fieldError = input.GetFieldError();
        if (fieldError is not null)
        {
            return ApiProblem.Unprocessable(fieldError);
        }

        if (!VinNormalization.TryNormalizeVin(input.Vin, out var normalizedVin, out var vinValidationError))
        {
            return ApiProblem.Unprocessable(vinValidationError);
        }

        if (!VehicleDrivetrainValidation.TryParse(input.DrivetrainType, out var drivetrainType, out var drivetrainValidationError))
        {
            return ApiProblem.Unprocessable(drivetrainValidationError);
        }

        var vehicle = await db.Vehicles
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

        if (vehicle is null)
        {
            return ApiProblem.NotFound("Vehicle not found.");
        }

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(input.LicensePlate, out var plateNormalized, out var plateValidationError))
        {
            return ApiProblem.Unprocessable(plateValidationError);
        }

        var conflict = await VehicleInput.FindUniquenessConflictAsync(db, plateNormalized, normalizedVin, id, cancellationToken);
        if (conflict is not null)
        {
            return ApiProblem.Conflict(conflict);
        }

        input.ApplyTo(vehicle, plateNormalized, normalizedVin, drivetrainType);
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> DeleteVehicleAsync(
        int id,
        HttpContext httpContext,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
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

        loggerFactory.CreateLogger("VehicleEndpoints.Delete").LogInformation(
            "Vehicle {VehicleId} deleted with its appointments and quotes by admin {ActorPersonId}.",
            id,
            httpContext.User.GetPersonIdOrDefault());

        return Results.NoContent();
    }
}
