using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Realtime;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** Handles `GET /api/appointments/updates`, streaming changes as SSE so clients reflect
        others' edits without polling; the minimal payload makes subscribers refresh, not patch state. */
    private static Task<IResult> StreamAppointmentUpdatesAsync(
        HttpContext httpContext,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
        => ServerSentEventStream.ServeAsync(
            httpContext,
            broadcaster,
            "appointment-updated",
            "appointment updates stream ready",
            "Too many active appointment update subscriptions. Please retry later.",
            cancellationToken);

    /** Publishes an appointment change to every live subscriber. Called from each mutation handler after its `SaveChangesAsync`, so a failed write never produces an event. */
    private static void PublishAppointmentChanged(IAppointmentUpdateBroadcaster broadcaster, int appointmentId)
        => broadcaster.Publish(new AppointmentUpdatedEvent(
            appointmentId,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()));
}
