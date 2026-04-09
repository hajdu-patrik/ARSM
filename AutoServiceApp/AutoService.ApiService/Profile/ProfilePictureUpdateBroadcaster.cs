using System.Collections.Concurrent;
using System.Threading.Channels;

namespace AutoService.ApiService.Profile;

internal sealed record ProfilePictureUpdatedEvent(
    int PersonId,
    bool HasProfilePicture,
    long CacheBuster);

internal interface IProfilePictureUpdateBroadcaster
{
    (Guid SubscriptionId, ChannelReader<ProfilePictureUpdatedEvent> Reader) Subscribe();

    void Unsubscribe(Guid subscriptionId);

    void Publish(ProfilePictureUpdatedEvent updateEvent);
}

internal sealed class ProfilePictureUpdateBroadcaster : IProfilePictureUpdateBroadcaster
{
    private readonly ConcurrentDictionary<Guid, Channel<ProfilePictureUpdatedEvent>> subscribers = new();

    public (Guid SubscriptionId, ChannelReader<ProfilePictureUpdatedEvent> Reader) Subscribe()
    {
        var subscriptionId = Guid.NewGuid();
        var channel = Channel.CreateUnbounded<ProfilePictureUpdatedEvent>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false,
            AllowSynchronousContinuations = false
        });

        subscribers[subscriptionId] = channel;
        return (subscriptionId, channel.Reader);
    }

    public void Unsubscribe(Guid subscriptionId)
    {
        if (subscribers.TryRemove(subscriptionId, out var channel))
        {
            channel.Writer.TryComplete();
        }
    }

    public void Publish(ProfilePictureUpdatedEvent updateEvent)
    {
        foreach (var channel in subscribers.Values)
        {
            channel.Writer.TryWrite(updateEvent);
        }
    }
}