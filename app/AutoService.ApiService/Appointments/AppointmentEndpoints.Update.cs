using AutoService.ApiService.Appointments.Realtime;
using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Vehicles;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;
using AutoService.ApiService.Identity;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
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

        if (request.DueDateTime == default)
        {
            return ApiProblem.Unprocessable("DueDateTime is required.");
        }

        var dueDateTimeUtc = DateTimeNormalization.ToUtc(request.DueDateTime);

        var taskDescription = request.TaskDescription?.Trim();
        if (string.IsNullOrWhiteSpace(taskDescription))
        {
            return ApiProblem.Unprocessable("TaskDescription is required.");
        }

        if (taskDescription.Length > 200)
        {
            return ApiProblem.Unprocessable("TaskDescription must be at most 200 characters.");
        }

        if (!user.TryGetPersonId(out var mechanicId))
        {
            logger.LogWarning("Appointment update rejected: missing or invalid person_id claim.");
            return Results.Unauthorized();
        }

        var isAdmin = user.IsInRole("Admin");

        var appointment = await db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle)
                .ThenInclude(v => v.Customer)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            logger.LogInformation("Appointment update failed: appointment {AppointmentId} not found.", id);
            return Results.NotFound(new { code = "appointment_not_found" });
        }

        if (!isAdmin && !appointment.Mechanics.Any(m => m.Id == mechanicId))
        {
            logger.LogWarning("Appointment update forbidden for mechanic {MechanicId} on appointment {AppointmentId}.", mechanicId, id);
            return Results.Forbid();
        }

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

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Appointment {AppointmentId} updated by mechanic {MechanicId}. IsAdmin: {IsAdmin}.", id, mechanicId, isAdmin);

        PublishAppointmentChanged(broadcaster, appointment.Id);

        return Results.Ok(ToDto(appointment));
    }

    /** Updates only the linked vehicle payload for an appointment while preserving the appointment fields and enforcing the same authorization constraints. */
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

        if (!user.TryGetPersonId(out var mechanicId))
        {
            logger.LogWarning("Appointment vehicle update rejected: missing or invalid person_id claim.");
            return Results.Unauthorized();
        }

        var isAdmin = user.IsInRole("Admin");

        var appointment = await db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle)
                .ThenInclude(v => v.Customer)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            logger.LogInformation("Appointment vehicle update failed: appointment {AppointmentId} not found.", id);
            return Results.NotFound(new { code = "appointment_not_found" });
        }

        if (!isAdmin && !appointment.Mechanics.Any(m => m.Id == mechanicId))
        {
            logger.LogWarning("Appointment vehicle update forbidden for mechanic {MechanicId} on appointment {AppointmentId}.", mechanicId, id);
            return Results.Forbid();
        }

        var input = request.ToInput();
        var fieldError = input.GetFieldError();
        if (fieldError is not null)
        {
            return ApiProblem.Unprocessable(fieldError);
        }

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(input.LicensePlate, out var plateNormalized, out var plateValidationError))
        {
            return ApiProblem.Unprocessable(plateValidationError);
        }

        if (!VinNormalization.TryNormalizeVin(input.Vin, out var normalizedVin, out var vinValidationError))
        {
            return ApiProblem.Unprocessable(vinValidationError);
        }

        if (!VehicleDrivetrainValidation.TryParse(input.DrivetrainType, out var drivetrainType, out var drivetrainValidationError))
        {
            return ApiProblem.Unprocessable(drivetrainValidationError);
        }

        var conflict = await VehicleInput.FindUniquenessConflictAsync(
            db, plateNormalized, normalizedVin, appointment.VehicleId, cancellationToken);
        if (conflict is not null)
        {
            logger.LogInformation("Appointment vehicle update failed on appointment {AppointmentId}: {Conflict}", id, conflict);
            return ApiProblem.Conflict(conflict);
        }

        input.ApplyTo(appointment.Vehicle, plateNormalized, normalizedVin, drivetrainType);

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Appointment {AppointmentId} vehicle updated by mechanic {MechanicId}. IsAdmin: {IsAdmin}.", id, mechanicId, isAdmin);

        PublishAppointmentChanged(broadcaster, appointment.Id);

        return Results.Ok(ToDto(appointment));
    }
}
