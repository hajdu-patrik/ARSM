using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Realtime;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** Handles `GET /api/appointments/updates`, streaming changes as SSE so clients refresh without polling. */
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
}
