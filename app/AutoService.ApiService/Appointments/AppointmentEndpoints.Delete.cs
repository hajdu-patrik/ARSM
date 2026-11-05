using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Data;
using AutoService.ApiService.Http;
using AutoService.ApiService.Lifecycle;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** A delete takes no version, so a row changed meanwhile is read again; this bounds those rereads. */
    private const int MaxDeleteAttempts = 3;

    /** Hard-deletes a non-completed appointment; its mechanic assignments and linked quotes are deleted with it (FK cascade). */
    private static async Task<IResult> DeleteAppointmentAsync(
        int id,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.Delete");

        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await TryDeleteAppointmentAsync(id, db, logger, broadcaster, cancellationToken);
            }
            catch (DbUpdateConcurrencyException) when (attempt < MaxDeleteAttempts)
            {
                // The xmin in the DELETE no longer matched: another request deleted or changed the row first.
                db.ChangeTracker.Clear();
            }
        }
    }

    private static async Task<IResult> TryDeleteAppointmentAsync(
        int id,
        AutoServiceDbContext db,
        ILogger logger,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var appointment = await db.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            logger.LogInformation("Appointment delete failed: appointment {AppointmentId} not found.", id);
            return AppointmentNotFound();
        }

        if (!AppointmentQuoteLifecycle.CanDelete(appointment.Status))
        {
            logger.LogInformation("Appointment delete rejected: appointment {AppointmentId} is completed.", id);
            return Results.Conflict(new ErrorCodeResponse(LifecycleErrorCodes.AppointmentCompletedTerminal));
        }

        db.Appointments.Remove(appointment);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Appointment {AppointmentId} deleted.", id);

        PublishAppointmentChanged(broadcaster, id);

        return Results.NoContent();
    }
}
