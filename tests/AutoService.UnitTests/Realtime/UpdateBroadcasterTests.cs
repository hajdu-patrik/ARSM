using System.Threading.Channels;
using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Profile.Realtime;
using AutoService.ApiService.Realtime;

namespace AutoService.UnitTests.Realtime;

/** The bounded fan-out: per-user and global caps, drop-oldest buffers, unsubscribe and per-user disconnect. */
public sealed class UpdateBroadcasterTests
{
    private sealed class SmallBroadcaster(int global = 200, int perUser = 5, int buffer = 32) : UpdateBroadcaster<string>
    {
        protected override int MaxConcurrentSubscriptions => global;

        protected override int MaxSubscriptionsPerUser => perUser;

        protected override int PerSubscriberBufferSize => buffer;
    }

    private static ChannelReader<string> Subscribe(UpdateBroadcaster<string> broadcaster, int userId, out Guid id)
    {
        Assert.True(broadcaster.TrySubscribe(userId, out id, out var reader));
        return reader;
    }

    [Fact]
    public void A_published_event_reaches_every_subscriber()
    {
        var broadcaster = new SmallBroadcaster();
        var first = Subscribe(broadcaster, 1, out _);
        var second = Subscribe(broadcaster, 2, out _);

        broadcaster.Publish("hello");

        Assert.True(first.TryRead(out var a));
        Assert.True(second.TryRead(out var b));
        Assert.Equal(("hello", "hello"), (a, b));
    }

    [Fact]
    public void Each_subscription_gets_its_own_id()
    {
        var broadcaster = new SmallBroadcaster();
        Subscribe(broadcaster, 1, out var first);
        Subscribe(broadcaster, 1, out var second);

        Assert.NotEqual(Guid.Empty, first);
        Assert.NotEqual(first, second);
    }

    [Fact]
    public void The_default_caps_are_five_streams_per_person_and_200_overall()
    {
        var broadcaster = new ProfilePictureUpdateBroadcaster();

        for (var i = 0; i < 5; i++)
        {
            Assert.True(broadcaster.TrySubscribe(1, out _, out _));
        }

        Assert.False(broadcaster.TrySubscribe(1, out var id, out var reader));
        Assert.Equal(Guid.Empty, id);
        Assert.Null(reader);
        Assert.True(broadcaster.TrySubscribe(2, out _, out _));
    }

    [Fact]
    public void The_global_cap_refuses_the_next_stream_and_a_refusal_does_not_use_up_a_slot()
    {
        var broadcaster = new SmallBroadcaster(global: 2, perUser: 10);
        Subscribe(broadcaster, 1, out var first);
        Subscribe(broadcaster, 2, out _);

        Assert.False(broadcaster.TrySubscribe(3, out _, out _));
        Assert.False(broadcaster.TrySubscribe(3, out _, out _));
        broadcaster.Unsubscribe(first);

        Assert.True(broadcaster.TrySubscribe(3, out _, out _));
        Assert.False(broadcaster.TrySubscribe(4, out _, out _));
    }

    [Fact]
    public void A_person_over_the_per_user_cap_does_not_consume_the_global_budget()
    {
        var broadcaster = new SmallBroadcaster(global: 2, perUser: 1);
        Subscribe(broadcaster, 1, out _);

        Assert.False(broadcaster.TrySubscribe(1, out _, out _));
        Assert.True(broadcaster.TrySubscribe(2, out _, out _));
    }

    [Fact]
    public void Unsubscribing_completes_the_stream_frees_the_slot_and_tolerates_an_unknown_id()
    {
        var broadcaster = new SmallBroadcaster(perUser: 1);
        var reader = Subscribe(broadcaster, 1, out var id);

        broadcaster.Unsubscribe(id);
        broadcaster.Unsubscribe(id);
        broadcaster.Unsubscribe(Guid.NewGuid());

        Assert.True(reader.Completion.IsCompleted);
        Assert.True(broadcaster.TrySubscribe(1, out _, out _));
    }

    [Fact]
    public void A_full_buffer_drops_the_oldest_events_instead_of_blocking_the_publisher()
    {
        var broadcaster = new SmallBroadcaster(buffer: 2);
        var reader = Subscribe(broadcaster, 1, out _);

        broadcaster.Publish("a");
        broadcaster.Publish("b");
        broadcaster.Publish("c");

        var received = new List<string>();
        while (reader.TryRead(out var item))
        {
            received.Add(item);
        }

        Assert.Equal(new[] { "b", "c" }, received);
    }

    [Fact]
    public void Disconnecting_a_person_ends_only_their_streams()
    {
        var broadcaster = new SmallBroadcaster();
        var own = Subscribe(broadcaster, 1, out _);
        var other = Subscribe(broadcaster, 2, out _);

        broadcaster.DisconnectUser(1);
        broadcaster.Publish("after");

        Assert.True(own.Completion.IsCompleted);
        Assert.False(other.Completion.IsCompleted);
        Assert.True(other.TryRead(out var item));
        Assert.Equal("after", item);
    }

    [Fact]
    public void A_publish_after_a_disconnect_removes_the_ended_subscription_and_frees_its_slot()
    {
        var broadcaster = new SmallBroadcaster(perUser: 1);
        Subscribe(broadcaster, 1, out _);
        broadcaster.DisconnectUser(1);
        Assert.False(broadcaster.TrySubscribe(1, out _, out _));

        broadcaster.Publish("sweep");

        Assert.True(broadcaster.TrySubscribe(1, out _, out _));
    }

    [Fact]
    public void Publishing_with_no_subscriber_is_a_no_op()
    {
        new SmallBroadcaster().Publish("nobody listens");
    }

    [Fact]
    public void The_typed_broadcasters_carry_their_own_payloads()
    {
        var appointments = new AppointmentUpdateBroadcaster();
        var pictures = new ProfilePictureUpdateBroadcaster();
        appointments.TrySubscribe(1, out _, out var appointmentReader);
        pictures.TrySubscribe(1, out _, out var pictureReader);

        appointments.Publish(new AppointmentUpdatedEvent(4, 99));
        pictures.Publish(new ProfilePictureUpdatedEvent(1, true, 55));

        Assert.True(appointmentReader.TryRead(out var appointment));
        Assert.Equal(new AppointmentUpdatedEvent(4, 99), appointment);
        Assert.True(pictureReader.TryRead(out var picture));
        Assert.Equal(new ProfilePictureUpdatedEvent(1, true, 55), picture);
    }
}
