using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Identity;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** Maps an {@code Appointment} domain entity to its DTO representation. */
    private static AppointmentDto ToDto(Appointment appointment) => new(
        appointment.Id,
        appointment.ScheduledDate,
        appointment.IntakeCreatedAt,
        appointment.DueDateTime,
        appointment.TaskDescription,
        appointment.Status.ToString(),
        appointment.CompletedAt,
        appointment.CanceledAt,
        new VehicleDto(
            appointment.Vehicle.Id,
            appointment.Vehicle.LicensePlate,
            appointment.Vehicle.Vin,
            appointment.Vehicle.Brand,
            appointment.Vehicle.Model,
            appointment.Vehicle.Year,
            appointment.Vehicle.MileageKm,
            appointment.Vehicle.EnginePowerKw,
            appointment.Vehicle.DrivetrainType.ToString(),
            appointment.Vehicle.CustomerId),
        appointment.Mechanics
            .Select(m => new MechanicSummaryDto(
                m.Id,
                m.Name.ToString(),
                m.Specialization.ToString(),
                m.ProfilePictureObjectKey is not null || m.ProfilePictureContentType is not null))
            .ToList());

    /** Loads an appointment tracked, with the mechanics, vehicle and owner that ToDto reads. */
    private static Task<Appointment?> LoadAppointmentAsync(AutoServiceDbContext db, int id, CancellationToken cancellationToken)
        => db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

    /** Loads an appointment the caller may edit, or the error when it is null: 401 without a person id,
        404 when missing, 403 unless admin or assigned. */
    private static async Task<(Appointment? Appointment, int MechanicId, IResult? Error)> LoadEditableAppointmentAsync(
        int id,
        ClaimsPrincipal user,
        string operation,
        AutoServiceDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (!user.TryGetPersonId(out var mechanicId))
        {
            logger.LogWarning("{Operation} rejected: missing or invalid person_id claim.", operation);
            return (null, 0, Results.Unauthorized());
        }

        var appointment = await LoadAppointmentAsync(db, id, cancellationToken);
        if (appointment is null)
        {
            logger.LogInformation("{Operation} failed: appointment {AppointmentId} not found.", operation, id);
            return (null, mechanicId, AppointmentNotFound());
        }

        if (!user.IsInRole("Admin") && !appointment.Mechanics.Any(m => m.Id == mechanicId))
        {
            logger.LogWarning("{Operation} forbidden for mechanic {MechanicId} on appointment {AppointmentId}.", operation, mechanicId, id);
            return (null, mechanicId, Results.Forbid());
        }

        return (appointment, mechanicId, null);
    }

    private static IResult AppointmentNotFound() => Results.NotFound(new { code = "appointment_not_found" });
}
