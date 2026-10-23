using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Lifecycle;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    private const string VersionConflictCode = "appointment_version_conflict";

    /** Maps a loaded appointment; the lifecycle flags read `Quotes`, so callers load it through LoadAppointmentAsync. */
    private static AppointmentDto ToDto(Appointment appointment)
    {
        var hasAcceptedQuote = AppointmentQuoteLifecycle.HasAcceptedQuote(appointment.Quotes);

        return new(
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
                .ToList(),
            appointment.Version,
            hasAcceptedQuote,
            AppointmentQuoteLifecycle.CanComplete(appointment.Status, hasAcceptedQuote),
            AppointmentQuoteLifecycle.CanDelete(appointment.Status),
            AppointmentQuoteLifecycle.CanLinkQuote(appointment.Status, hasAcceptedQuote));
    }

    /** Loads an appointment tracked, with the mechanics, vehicle, owner and quotes that ToDto reads. */
    private static Task<Appointment?> LoadAppointmentAsync(AutoServiceDbContext db, int id, CancellationToken cancellationToken)
        => db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .Include(a => a.Quotes)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

    /** Saves an edited appointment under the client's version; the shared rule answers 409 appointment_version_conflict when stale. */
    private static Task<IResult?> SaveAppointmentWithVersionAsync(
        AutoServiceDbContext db,
        Appointment appointment,
        uint version,
        CancellationToken cancellationToken)
        => OptimisticConcurrency.SaveWithVersionAsync(db, appointment, version, VersionConflictCode, cancellationToken);

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
