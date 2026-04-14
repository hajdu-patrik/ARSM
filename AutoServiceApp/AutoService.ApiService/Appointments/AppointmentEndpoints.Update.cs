/**
 * AppointmentEndpoints.Update.cs
 *
 * Auto-generated documentation header for this source file.
 */

using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Vehicles;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

/**
 * Backend type for API logic in this file.
 */
public static partial class AppointmentEndpoints
{
        private static async Task<IResult> UpdateAppointmentAsync(
        int id,
        UpdateAppointmentRequest request,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.Update");

        if (request.DueDateTime == default)
        {
            return Results.Problem(
                detail: "DueDateTime is required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var dueDateTimeUtc = NormalizeToUtc(request.DueDateTime);

        var taskDescription = request.TaskDescription?.Trim();
        if (string.IsNullOrWhiteSpace(taskDescription))
        {
            return Results.Problem(
                detail: "TaskDescription is required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (taskDescription.Length > 200)
        {
            return Results.Problem(
                detail: "TaskDescription must be at most 200 characters.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var personIdClaim = user.FindFirst("person_id")?.Value;
        if (string.IsNullOrWhiteSpace(personIdClaim) || !int.TryParse(personIdClaim, out var mechanicId))
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

        var nowUtc = DateTime.UtcNow;
        var appointmentIsInPast = appointment.ScheduledDate < nowUtc;
        var effectiveScheduledDateUtc = appointment.ScheduledDate;

        if (appointmentIsInPast)
        {
            if (request.ScheduledDate != default)
            {
                var scheduledDateUtc = NormalizeToUtc(request.ScheduledDate);
                if (scheduledDateUtc != appointment.ScheduledDate)
                {
                    logger.LogWarning("Appointment update rejected: attempted ScheduledDate change for past appointment {AppointmentId}.", id);
                    return Results.Problem(
                        detail: "ScheduledDate cannot be changed for past appointments.",
                        statusCode: StatusCodes.Status422UnprocessableEntity);
                }
            }
        }
        else
        {
            if (request.ScheduledDate == default)
            {
                return Results.Problem(
                    detail: "ScheduledDate is required.",
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            var scheduledDateUtc = NormalizeToUtc(request.ScheduledDate);
            if (scheduledDateUtc.Date < nowUtc.Date)
            {
                return Results.Problem(
                    detail: "ScheduledDate cannot be in the past.",
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            appointment.ScheduledDate = scheduledDateUtc;
            effectiveScheduledDateUtc = scheduledDateUtc;
        }

        if (dueDateTimeUtc < effectiveScheduledDateUtc)
        {
            return Results.Problem(
                detail: "DueDateTime must be greater than or equal to ScheduledDate.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var hasVehiclePayload = request.Year != default ||
            request.MileageKm != default ||
            request.EnginePowerHp != default ||
            request.EngineTorqueNm != default ||
            request.LicensePlate is not null ||
            request.Brand is not null ||
            request.Model is not null;

        if (hasVehiclePayload)
        {
            if (string.IsNullOrWhiteSpace(request.LicensePlate) ||
                string.IsNullOrWhiteSpace(request.Brand) ||
                string.IsNullOrWhiteSpace(request.Model))
            {
                return Results.Problem(
                    detail: "LicensePlate, Brand, and Model are required.",
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            var vehicleLengthValidationError = VehicleEndpoints.GetVehicleFieldLengthValidationError(
                request.LicensePlate,
                request.Brand,
                request.Model);

            if (vehicleLengthValidationError is not null)
            {
                return Results.Problem(
                    detail: vehicleLengthValidationError,
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            if (request.Year is < 1886 or > 2100)
            {
                return Results.Problem(
                    detail: "Year must be between 1886 and 2100.",
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            var vehicleNumericValidationError = VehicleNumericValidation.GetValidationError(
                request.MileageKm,
                request.EnginePowerHp,
                request.EngineTorqueNm);

            if (vehicleNumericValidationError is not null)
            {
                return Results.Problem(
                    detail: vehicleNumericValidationError,
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(request.LicensePlate, out var plateNormalized, out var plateValidationError))
            {
                return Results.Problem(
                    detail: plateValidationError,
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            var plateConflict = await db.Vehicles
                .AnyAsync(v => v.LicensePlate == plateNormalized && v.Id != appointment.VehicleId, cancellationToken);

            if (plateConflict)
            {
                logger.LogInformation("Appointment update failed due to license plate conflict on appointment {AppointmentId}.", id);
                return Results.Problem(
                    detail: "A vehicle with this license plate already exists.",
                    statusCode: StatusCodes.Status409Conflict);
            }

            appointment.Vehicle.LicensePlate = plateNormalized;
            appointment.Vehicle.Brand = request.Brand.Trim();
            appointment.Vehicle.Model = request.Model.Trim();
            appointment.Vehicle.Year = request.Year;
            appointment.Vehicle.MileageKm = request.MileageKm;
            appointment.Vehicle.EnginePowerHp = request.EnginePowerHp;
            appointment.Vehicle.EngineTorqueNm = request.EngineTorqueNm;
        }

        appointment.DueDateTime = dueDateTimeUtc;
        appointment.TaskDescription = taskDescription;

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Appointment {AppointmentId} updated by mechanic {MechanicId}. IsAdmin: {IsAdmin}.", id, mechanicId, isAdmin);

        return Results.Ok(ToDto(appointment));
    }
}
