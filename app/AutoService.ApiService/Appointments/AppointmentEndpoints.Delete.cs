using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /**
     * Hard-deletes an appointment and its mechanic assignments.
     * Endpoint: DELETE /api/appointments/{id} (AdminOnly).
     *
     * Mechanic-assignment rows cascade at the database level
     * (appointmentmechanics FKs use DeleteBehavior.Cascade), and any quote
     * still pointing at this appointment has its AppointmentId set to null
     * by the same statement (Quote.AppointmentId uses
     * DeleteBehavior.SetNull), so both happen inside this one
     * SaveChangesAsync without loading either relationship.
     *
     * @param id Appointment ID.
     * @param db Database context.
     * @param loggerFactory Logger factory used to create endpoint logger.
     * @param broadcaster Appointment update fan-out notified after the delete is saved.
     * @param cancellationToken Request cancellation token.
     * @return No content on success, or a not-found result.
     */
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
            return Results.NotFound(new { code = "appointment_not_found" });
        }

        db.Appointments.Remove(appointment);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Appointment {AppointmentId} deleted.", id);

        PublishAppointmentChanged(broadcaster, id);

        return Results.NoContent();
    }
}
