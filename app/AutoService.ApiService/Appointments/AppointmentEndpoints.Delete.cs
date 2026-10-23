using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Data;
using AutoService.ApiService.Http;
using AutoService.ApiService.Lifecycle;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** Hard-deletes a non-completed appointment; its mechanic assignments and linked quotes are deleted with it (FK cascade). */
    private static async Task<IResult> DeleteAppointmentAsync(
        int id,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.Delete");

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
