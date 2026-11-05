using System.Threading.Channels;
using AutoService.ApiService.Appointments.Realtime;

namespace AutoService.UnitTests.Realtime;

/** The shared publish helpers behind the new appointment-updated triggers (K9): one event per distinct id. */
public sealed class AppointmentUpdatePublishingTests
{
    private static (AppointmentUpdateBroadcaster Broadcaster, ChannelReader<AppointmentUpdatedEvent> Reader) Subscribed()
    {
        var broadcaster = new AppointmentUpdateBroadcaster();
        Assert.True(broadcaster.TrySubscribe(1, out _, out var reader));
        return (broadcaster, reader);
    }

    private static List<AppointmentUpdatedEvent> Drain(ChannelReader<AppointmentUpdatedEvent> reader)
    {
        var events = new List<AppointmentUpdatedEvent>();
        while (reader.TryRead(out var item))
        {
            events.Add(item);
        }

        return events;
    }

    [Fact]
    public void PublishAppointmentChanged_sends_the_id_with_a_current_unix_millisecond_timestamp()
    {
        var (broadcaster, reader) = Subscribed();
        var before = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        broadcaster.PublishAppointmentChanged(42);

        var published = Assert.Single(Drain(reader));
        Assert.Equal(42, published.AppointmentId);
        Assert.InRange(published.OccurredAt, before, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
    }

    [Fact]
    public void PublishAppointmentsChanged_sends_one_event_per_distinct_id_in_order()
    {
        var (broadcaster, reader) = Subscribed();

        broadcaster.PublishAppointmentsChanged([4, 4, 7, 4, 9]);

        Assert.Equal([4, 7, 9], Drain(reader).Select(e => e.AppointmentId));
    }

    [Fact]
    public void PublishAppointmentsChanged_sends_nothing_for_an_empty_list()
    {
        var (broadcaster, reader) = Subscribed();

        broadcaster.PublishAppointmentsChanged([]);

        Assert.Empty(Drain(reader));
    }
}
