using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** Hard-deletes an appointment and its mechanic assignments. Endpoint: DELETE /api/appointments/{id}
        (AdminOnly); mechanic rows cascade and a linked quote's AppointmentId is set null (docs/PROJECT-OVERVIEW.md). */
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
