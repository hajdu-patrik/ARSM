using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Vehicles;
using Microsoft.EntityFrameworkCore;

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
            return (Results.Problem(
                detail: "Vehicle not found.",
                statusCode: StatusCodes.Status404NotFound), null);
        }

        if (customer is null || existingVehicle.CustomerId != customer.Id)
        {
            logger.LogWarning("Intake rejected: vehicle {VehicleId} does not belong to selected customer.", requestedVehicleId);
            return (IntakeProblem("Vehicle does not belong to the selected customer."), null);
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
        var error = ValidateIntakeVehicleFields(newVehicle);
        if (error is not null)
        {
            return (error, null);
        }

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(newVehicle.LicensePlate, out var normalizedPlate, out var plateValidationError))
        {
            return (IntakeProblem(plateValidationError), null);
        }

        if (!VinNormalization.TryNormalizeVin(newVehicle.Vin, out var normalizedVin, out var vinValidationError))
        {
            return (IntakeProblem(vinValidationError), null);
        }

        if (!VehicleDrivetrainValidation.TryParse(newVehicle.DrivetrainType, out var drivetrainType, out var drivetrainValidationError, "Vehicle.DrivetrainType"))
        {
            return (IntakeProblem(drivetrainValidationError), null);
        }

        if (await db.Vehicles.AnyAsync(v => v.LicensePlate == normalizedPlate, cancellationToken))
        {
            return (Results.Problem(
                detail: "A vehicle with this license plate already exists.",
                statusCode: StatusCodes.Status409Conflict), null);
        }

        if (await db.Vehicles.AnyAsync(v => v.Vin == normalizedVin, cancellationToken))
        {
            return (Results.Problem(
                detail: "A vehicle with this VIN already exists.",
                statusCode: StatusCodes.Status409Conflict), null);
        }

        var vehicle = new Vehicle(
            normalizedPlate,
            normalizedVin,
            newVehicle.Brand.Trim(),
            newVehicle.Model.Trim(),
            newVehicle.Year,
            newVehicle.MileageKm,
            newVehicle.EnginePowerKw,
            drivetrainType)
        {
            Customer = customer
        };

        if (customer.Id > 0)
        {
            vehicle.CustomerId = customer.Id;
        }

        return (null, vehicle);
    }

    private static IResult? ValidateIntakeVehicleFields(SchedulerNewVehicleRequest newVehicle)
    {
        if (string.IsNullOrWhiteSpace(newVehicle.LicensePlate) ||
            string.IsNullOrWhiteSpace(newVehicle.Vin) ||
            string.IsNullOrWhiteSpace(newVehicle.Brand) ||
            string.IsNullOrWhiteSpace(newVehicle.Model) ||
            string.IsNullOrWhiteSpace(newVehicle.DrivetrainType))
        {
            return IntakeProblem("Vehicle.LicensePlate, Vehicle.Vin, Vehicle.Brand, Vehicle.Model, and Vehicle.DrivetrainType are required.");
        }

        var lengthError = VehicleEndpoints.GetVehicleFieldLengthValidationError(
            newVehicle.LicensePlate,
            newVehicle.Brand,
            newVehicle.Model,
            fieldPrefix: "Vehicle.");

        if (lengthError is not null)
        {
            return IntakeProblem(lengthError);
        }

        if (newVehicle.Year is < 1886 or > 2100)
        {
            return IntakeProblem("Vehicle.Year must be between 1886 and 2100.");
        }

        var numericError = VehicleNumericValidation.GetValidationError(
            newVehicle.MileageKm,
            newVehicle.EnginePowerKw,
            fieldPrefix: "Vehicle.");

        return numericError is null ? null : IntakeProblem(numericError);
    }
}
