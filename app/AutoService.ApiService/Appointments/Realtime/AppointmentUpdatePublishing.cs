namespace AutoService.ApiService.Appointments.Realtime;

internal static class AppointmentUpdatePublishing
{
    /** Publishes one appointment change to every live subscriber; call it after the save succeeded. */
    internal static void PublishAppointmentChanged(this IAppointmentUpdateBroadcaster broadcaster, int appointmentId)
        => broadcaster.Publish(new AppointmentUpdatedEvent(
            appointmentId,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()));

    /** Publishes one event per distinct appointment id. */
    internal static void PublishAppointmentsChanged(this IAppointmentUpdateBroadcaster broadcaster, IEnumerable<int> appointmentIds)
    {
        foreach (var appointmentId in appointmentIds.Distinct())
        {
            broadcaster.PublishAppointmentChanged(appointmentId);
        }
    }
}
