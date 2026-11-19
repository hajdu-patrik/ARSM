using AutoService.ApiService.Appointments.Realtime;
using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Vehicles;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** Updates the due date and task description of an appointment the caller may edit, under the submitted version. */
    private static async Task<IResult> UpdateAppointmentAsync(
        int id,
        UpdateAppointmentRequest request,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.Update");

        var fieldError = ValidateUpdateFields(request, out var dueDateTimeUtc, out var taskDescription);
        if (fieldError is not null)
        {
            return fieldError;
        }

        var missingVersionError = OptimisticConcurrency.GetMissingVersionError(request.Version);
        if (missingVersionError is not null)
        {
            return missingVersionError;
        }

        var (appointment, mechanicId, loadError) = await LoadEditableAppointmentAsync(
            id, user, "Appointment update", db, logger, cancellationToken);
        if (appointment is null)
        {
            return loadError!;
        }

        var isAdmin = user.IsInRole("Admin");

        if (request.ScheduledDate is not null)
        {
            var scheduledDateUtc = DateTimeNormalization.ToUtc(request.ScheduledDate.Value);
            if (scheduledDateUtc != appointment.ScheduledDate)
            {
                logger.LogWarning("Appointment update rejected: attempted ScheduledDate change for appointment {AppointmentId}.", id);
                return ApiProblem.Unprocessable("ScheduledDate cannot be changed.");
            }
        }

        if (dueDateTimeUtc < appointment.ScheduledDate)
        {
            return ApiProblem.Unprocessable("DueDateTime must be greater than or equal to ScheduledDate.");
        }

        appointment.DueDateTime = dueDateTimeUtc;
        appointment.TaskDescription = taskDescription;

        var saveError = await SaveAppointmentWithVersionAsync(db, appointment, request.Version, cancellationToken);
        if (saveError is not null)
        {
            return saveError;
        }

        logger.LogInformation("Appointment {AppointmentId} updated by mechanic {MechanicId}. IsAdmin: {IsAdmin}.", id, mechanicId, isAdmin);

        broadcaster.PublishAppointmentChanged(appointment.Id);

        return Results.Ok(ToDto(appointment));
    }

    /** Returns the 422 for a missing due date or an invalid description, else null with the normalized values. */
    private static IResult? ValidateUpdateFields(
        UpdateAppointmentRequest request,
        out DateTime dueDateTimeUtc,
        out string taskDescription)
    {
        dueDateTimeUtc = default;
        taskDescription = string.Empty;

        if (request.DueDateTime == default)
        {
            return ApiProblem.Unprocessable("DueDateTime is required.");
        }

        dueDateTimeUtc = DateTimeNormalization.ToUtc(request.DueDateTime);

        var trimmed = request.TaskDescription?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return ApiProblem.Unprocessable("TaskDescription is required.");
        }

        if (trimmed.Length > 200)
        {
            return ApiProblem.Unprocessable("TaskDescription must be at most 200 characters.");
        }

        taskDescription = trimmed;
        return null;
    }

    /** Replaces the vehicle details of an appointment the caller may edit, keeping plate and VIN unique. */
    private static async Task<IResult> UpdateAppointmentVehicleAsync(
        int id,
        UpdateAppointmentVehicleRequest request,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.UpdateVehicle");

        var (appointment, mechanicId, loadError) = await LoadEditableAppointmentAsync(
            id, user, "Appointment vehicle update", db, logger, cancellationToken);
        if (appointment is null)
        {
            return loadError!;
        }

        var isAdmin = user.IsInRole("Admin");

        var input = request.ToInput();
        var inputError = NormalizeVehicleInput(input, out var normalizedPlate, out var normalizedVin, out var drivetrainType);
        if (inputError is not null)
        {
            return inputError;
        }

        var conflict = await VehicleInput.FindUniquenessConflictAsync(
            db, normalizedPlate, normalizedVin, appointment.VehicleId, cancellationToken);
        if (conflict is not null)
        {
            logger.LogInformation("Appointment vehicle update failed on appointment {AppointmentId}: {Conflict}", id, conflict);
            return ApiProblem.Conflict(conflict);
        }

        var vehicleId = appointment.VehicleId;
        input.ApplyTo(appointment.Vehicle, normalizedPlate, normalizedVin, drivetrainType);

        var raceConflict = await UniqueConstraintDetection.SaveOrConflictAsync(
            db,
            token => VehicleInput.FindUniquenessConflictAsync(db, normalizedPlate, normalizedVin, vehicleId, token),
            VehicleInput.PlateTakenDetail,
            cancellationToken,
            AppointmentNotFound());
        if (raceConflict is not null)
        {
            return raceConflict;
        }

        logger.LogInformation("Appointment {AppointmentId} vehicle updated by mechanic {MechanicId}. IsAdmin: {IsAdmin}.", id, mechanicId, isAdmin);

        broadcaster.PublishAppointmentChanged(appointment.Id);

        return Results.Ok(ToDto(appointment));
    }

    /** Returns the 422 for an invalid field, plate, VIN or drivetrain, else null with the normalized values. */
    private static IResult? NormalizeVehicleInput(
        VehicleInput input,
        out string normalizedPlate,
        out string normalizedVin,
        out DrivetrainType drivetrainType)
    {
        normalizedPlate = string.Empty;
        normalizedVin = string.Empty;
        drivetrainType = default;

        var fieldError = input.GetFieldError();
        if (fieldError is not null)
        {
            return ApiProblem.Unprocessable(fieldError);
        }

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(input.LicensePlate, out normalizedPlate, out var plateValidationError))
        {
            return ApiProblem.Unprocessable(plateValidationError);
        }

        if (!VinNormalization.TryNormalizeVin(input.Vin, out normalizedVin, out var vinValidationError))
        {
            return ApiProblem.Unprocessable(vinValidationError);
        }

        return VehicleDrivetrainValidation.TryParse(input.DrivetrainType, out drivetrainType, out var drivetrainValidationError)
            ? null
            : ApiProblem.Unprocessable(drivetrainValidationError);
    }
}
