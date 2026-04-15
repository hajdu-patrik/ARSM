/**
 * ProfilePictureUpdateBroadcaster.cs
 *
 * Auto-generated documentation header for this source file.
 */

using System.Collections.Concurrent;
using System.Threading.Channels;

namespace AutoService.ApiService.Profile.Realtime;

/**
 * Immutable DTO used by API request and response flows.
 */
internal sealed record ProfilePictureUpdatedEvent(
    int PersonId,
    bool HasProfilePicture,
    long CacheBuster);

/**
 * Contract for related backend behavior.
 */
internal interface IProfilePictureUpdateBroadcaster
{
    bool TrySubscribe(out Guid subscriptionId, out ChannelReader<ProfilePictureUpdatedEvent> reader);

    void Unsubscribe(Guid subscriptionId);

    void Publish(ProfilePictureUpdatedEvent updateEvent);
}

/**
 * Backend type for API logic in this file.
 */
internal sealed class ProfilePictureUpdateBroadcaster : IProfilePictureUpdateBroadcaster
{
    private const int MaxConcurrentSubscriptions = 200;
    private const int PerSubscriberBufferSize = 32;

    private readonly ConcurrentDictionary<Guid, Channel<ProfilePictureUpdatedEvent>> subscribers = new();
    private int subscriptionCount;

        /**
         * TrySubscribe operation.
         *
         * @param subscriptionId Parameter.
         * @param reader Parameter.
         * @returns Return value.
         */
        public bool TrySubscribe(out Guid subscriptionId, out ChannelReader<ProfilePictureUpdatedEvent> reader)
    {
        var newCount = Interlocked.Increment(ref subscriptionCount);
        if (newCount > MaxConcurrentSubscriptions)
        {
            Interlocked.Decrement(ref subscriptionCount);
            subscriptionId = Guid.Empty;
            reader = null!;
            return false;
        }

        subscriptionId = Guid.NewGuid();
        var channel = Channel.CreateBounded<ProfilePictureUpdatedEvent>(new BoundedChannelOptions(PerSubscriberBufferSize)
        {
            SingleReader = true,
            SingleWriter = false,
            AllowSynchronousContinuations = false,
            FullMode = BoundedChannelFullMode.DropOldest
        });

        if (!subscribers.TryAdd(subscriptionId, channel))
        {
            channel.Writer.TryComplete();
            Interlocked.Decrement(ref subscriptionCount);
            subscriptionId = Guid.Empty;
            reader = null!;
            return false;
        }

        reader = channel.Reader;
        return true;
    }

        /**
         * Unsubscribe operation.
         *
         * @param subscriptionId Parameter.
         */
        public void Unsubscribe(Guid subscriptionId)
    {
        if (subscribers.TryRemove(subscriptionId, out var channel))
        {
            channel.Writer.TryComplete();
            Interlocked.Decrement(ref subscriptionCount);
        }
    }

        /**
         * Publish operation.
         *
         * @param updateEvent Parameter.
         */
        public void Publish(ProfilePictureUpdatedEvent updateEvent)
    {
        foreach (var subscriber in subscribers)
        {
            var channel = subscriber.Value;
            if (!channel.Writer.TryWrite(updateEvent) && channel.Reader.Completion.IsCompleted)
            {
                Unsubscribe(subscriber.Key);
            }
        }
    }
}