using AutoService.ApiService.Appointments.Realtime;
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

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(input.LicensePlate, out var normalizedPlate, out var plateValidationError))
        {
            return ApiProblem.Unprocessable(plateValidationError);
        }

        var conflict = await VehicleInput.FindUniquenessConflictAsync(db, normalizedPlate, normalizedVin, null, cancellationToken);
        if (conflict is not null)
        {
            return ApiProblem.Conflict(conflict);
        }

        var vehicle = input.ToEntity(normalizedPlate, normalizedVin, drivetrainType);
        vehicle.CustomerId = customerId;

        db.Vehicles.Add(vehicle);
        var raceConflict = await UniqueConstraintDetection.SaveOrConflictAsync(
            db,
            token => VehicleInput.FindUniquenessConflictAsync(db, normalizedPlate, normalizedVin, null, token),
            VehicleInput.PlateTakenDetail,
            cancellationToken);
        if (raceConflict is not null)
        {
            return raceConflict;
        }

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

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(input.LicensePlate, out var normalizedPlate, out var plateValidationError))
        {
            return ApiProblem.Unprocessable(plateValidationError);
        }

        var conflict = await VehicleInput.FindUniquenessConflictAsync(db, normalizedPlate, normalizedVin, id, cancellationToken);
        if (conflict is not null)
        {
            return ApiProblem.Conflict(conflict);
        }

        input.ApplyTo(vehicle, normalizedPlate, normalizedVin, drivetrainType);
        var raceConflict = await UniqueConstraintDetection.SaveOrConflictAsync(
            db,
            token => VehicleInput.FindUniquenessConflictAsync(db, normalizedPlate, normalizedVin, id, token),
            VehicleInput.PlateTakenDetail,
            cancellationToken,
            ApiProblem.NotFound("Vehicle not found."));

        return raceConflict ?? Results.NoContent();
    }

    private static async Task<IResult> DeleteVehicleAsync(
        int id,
        HttpContext httpContext,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var vehicle = await db.Vehicles
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

        if (vehicle is null)
        {
            return ApiProblem.NotFound("Vehicle not found.");
        }

        // The FK cascade deletes these appointments, so live subscribers are told about each one after the commit.
        var appointmentIds = await db.Appointments
            .Where(a => a.VehicleId == id)
            .Select(a => a.Id)
            .ToListAsync(cancellationToken);

        db.Vehicles.Remove(vehicle);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // A parallel delete removed the row first; answer like a sequential repeat.
            return ApiProblem.NotFound("Vehicle not found.");
        }

        broadcaster.PublishAppointmentsChanged(appointmentIds);

        loggerFactory.CreateLogger("VehicleEndpoints.Delete").LogInformation(
            "Vehicle {VehicleId} deleted with its appointments and quotes by admin {ActorPersonId}.",
            id,
            httpContext.User.GetPersonIdOrDefault());

        return Results.NoContent();
    }
}
