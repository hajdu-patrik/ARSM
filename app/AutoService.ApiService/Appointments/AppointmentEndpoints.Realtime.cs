using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Realtime;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** Handles {@code GET /api/appointments/updates}, streaming changes as SSE so clients reflect
        others' edits without polling; the minimal payload makes subscribers refresh, not patch state. */
    private static async Task<IResult> StreamAppointmentUpdatesAsync(
        HttpContext httpContext,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var personIdClaim = httpContext.User.FindFirst("person_id")?.Value;
        var userId = int.TryParse(personIdClaim, out var parsedPersonId) ? parsedPersonId : 0;

        if (!broadcaster.TrySubscribe(userId, out var subscriptionId, out var reader))
        {
            return Results.Problem(
                detail: "Too many active appointment update subscriptions. Please retry later.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        ServerSentEventStream.ConfigureResponse(httpContext.Response);

        try
        {
            await ServerSentEventStream.WriteAsync(
                httpContext.Response,
                reader,
                "appointment-updated",
                "appointment updates stream ready",
                cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Client disconnected.
        }
        finally
        {
            broadcaster.Unsubscribe(subscriptionId);
        }

        return Results.Empty;
    }

    /** Publishes an appointment change to every live subscriber. Called from each mutation handler after its {@code SaveChangesAsync}, so a failed write never produces an event. */
    private static void PublishAppointmentChanged(IAppointmentUpdateBroadcaster broadcaster, int appointmentId)
        => broadcaster.Publish(new AppointmentUpdatedEvent(
            appointmentId,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()));
}
