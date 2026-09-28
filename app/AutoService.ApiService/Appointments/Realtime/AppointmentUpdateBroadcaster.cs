using AutoService.ApiService.Realtime;

namespace AutoService.ApiService.Appointments.Realtime;

/** Payload published whenever an appointment is created or changed; deliberately small, since
    subscribers refresh their view rather than patch state from it (an appointment can move months). */
internal sealed record AppointmentUpdatedEvent(
    int AppointmentId,
    long OccurredAt);

/** Fan-out channel for appointment changes. */
internal interface IAppointmentUpdateBroadcaster : IUpdateBroadcaster<AppointmentUpdatedEvent>;

/** Appointment channel over the shared bounded fan-out (concurrency lives in UpdateBroadcaster<TEvent>);
    this type only fixes the payload, giving it its own DI registration and subscription budget. */
internal sealed class AppointmentUpdateBroadcaster
    : UpdateBroadcaster<AppointmentUpdatedEvent>, IAppointmentUpdateBroadcaster;
