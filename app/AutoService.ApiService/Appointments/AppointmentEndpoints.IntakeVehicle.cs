using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Vehicles;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** Loads the customer's existing vehicle of an intake and checks that it belongs to that customer. */
    private static async Task<(IResult? Error, Vehicle? Vehicle)> FindIntakeVehicleAsync(
        int requestedVehicleId,
        Customer? customer,
        AutoServiceDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        Vehicle? existingVehicle = await db.Vehicles
            .Where(v => v.Id == requestedVehicleId)
            .Select(v => (Vehicle?)v)
            .FirstOrDefaultAsync(cancellationToken);

        if (existingVehicle is null)
        {
            logger.LogInformation("Intake failed: requested vehicle {VehicleId} not found.", requestedVehicleId);
            return (ApiProblem.NotFound("Vehicle not found."), null);
        }

        if (customer is null || existingVehicle.CustomerId != customer.Id)
        {
            logger.LogWarning("Intake rejected: vehicle {VehicleId} does not belong to selected customer.", requestedVehicleId);
            return (ApiProblem.Unprocessable("Vehicle does not belong to the selected customer."), null);
        }

        return (null, existingVehicle);
    }

    /** Validates the new vehicle of an intake, checks plate and VIN uniqueness and builds the unsaved vehicle. */
    private static async Task<(IResult? Error, Vehicle? Vehicle)> CreateIntakeVehicleAsync(
        SchedulerNewVehicleRequest newVehicle,
        Customer customer,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var input = newVehicle.ToInput();
        var fieldError = input.GetFieldError(prefix: "Vehicle.");
        if (fieldError is not null)
        {
            return (ApiProblem.Unprocessable(fieldError), null);
        }

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(input.LicensePlate, out var normalizedPlate, out var plateValidationError))
        {
            return (ApiProblem.Unprocessable(plateValidationError), null);
        }

        if (!VinNormalization.TryNormalizeVin(input.Vin, out var normalizedVin, out var vinValidationError))
        {
            return (ApiProblem.Unprocessable(vinValidationError), null);
        }

        if (!VehicleDrivetrainValidation.TryParse(input.DrivetrainType, out var drivetrainType, out var drivetrainValidationError, "Vehicle.DrivetrainType"))
        {
            return (ApiProblem.Unprocessable(drivetrainValidationError), null);
        }

        var conflict = await VehicleInput.FindUniquenessConflictAsync(db, normalizedPlate, normalizedVin, null, cancellationToken);
        if (conflict is not null)
        {
            return (ApiProblem.Conflict(conflict), null);
        }

        var vehicle = input.ToEntity(normalizedPlate, normalizedVin, drivetrainType);
        vehicle.Customer = customer;

        if (customer.Id > 0)
        {
            vehicle.CustomerId = customer.Id;
        }

        return (null, vehicle);
    }
}
