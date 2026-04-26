using System.Collections.Concurrent;
using System.Threading.Channels;

namespace AutoService.ApiService.Profile.Realtime;

internal sealed record ProfilePictureUpdatedEvent(
    int PersonId,
    bool HasProfilePicture,
    long CacheBuster);

internal interface IProfilePictureUpdateBroadcaster
{
    bool TrySubscribe(int userId, out Guid subscriptionId, out ChannelReader<ProfilePictureUpdatedEvent> reader);

    void Unsubscribe(Guid subscriptionId);

    void Publish(ProfilePictureUpdatedEvent updateEvent);
}

internal sealed class ProfilePictureUpdateBroadcaster : IProfilePictureUpdateBroadcaster
{
    private const int MaxConcurrentSubscriptions = 200;
    private const int MaxSubscriptionsPerUser = 5;
    private const int PerSubscriberBufferSize = 32;

    private readonly ConcurrentDictionary<Guid, (Channel<ProfilePictureUpdatedEvent> Channel, int UserId)> subscribers = new();
    private int subscriptionCount;

    public bool TrySubscribe(int userId, out Guid subscriptionId, out ChannelReader<ProfilePictureUpdatedEvent> reader)
    {
        var userCount = subscribers.Values.Count(s => s.UserId == userId);
        if (userCount >= MaxSubscriptionsPerUser)
        {
            subscriptionId = Guid.Empty;
            reader = null!;
            return false;
        }

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

        if (!subscribers.TryAdd(subscriptionId, (channel, userId)))
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

    public void Unsubscribe(Guid subscriptionId)
    {
        if (subscribers.TryRemove(subscriptionId, out var entry))
        {
            entry.Channel.Writer.TryComplete();
            Interlocked.Decrement(ref subscriptionCount);
        }
    }

    public void Publish(ProfilePictureUpdatedEvent updateEvent)
    {
        foreach (var subscriber in subscribers)
        {
            var channel = subscriber.Value.Channel;
            if (!channel.Writer.TryWrite(updateEvent) && channel.Reader.Completion.IsCompleted)
            {
                Unsubscribe(subscriber.Key);
            }
        }
    }
}