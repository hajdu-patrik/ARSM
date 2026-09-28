using System.Collections.Concurrent;
using System.Threading.Channels;

namespace AutoService.ApiService.Realtime;

/** Fan-out contract for server-sent update channels. */
internal interface IUpdateBroadcaster<TEvent>
{
    /** Registers a subscriber unless a capacity limit is reached. */
    bool TrySubscribe(int userId, out Guid subscriptionId, out ChannelReader<TEvent> reader);

    /** Releases a subscription and its channel. */
    void Unsubscribe(Guid subscriptionId);

    /** Delivers an event to every current subscriber. */
    void Publish(TEvent updateEvent);
}

/** Bounded in-memory fan-out for the SSE endpoints: each subscriber gets its own DropOldest channel,
    so a slow client misses events instead of back-pressuring a mutation (caps: ApiService/CLAUDE.md). */
internal abstract class UpdateBroadcaster<TEvent> : IUpdateBroadcaster<TEvent>
{
    /** Upper bound on simultaneously open streams for this channel. */
    protected virtual int MaxConcurrentSubscriptions => 200;

    /** Upper bound on simultaneously open streams for a single person. */
    protected virtual int MaxSubscriptionsPerUser => 5;

    /** Events buffered per subscriber before the oldest is dropped. */
    protected virtual int PerSubscriberBufferSize => 32;

    private readonly ConcurrentDictionary<Guid, (Channel<TEvent> Channel, int UserId)> subscribers = new();
    private int subscriptionCount;

    /** Registers a subscriber unless the per-user or global cap is reached. */
    public bool TrySubscribe(int userId, out Guid subscriptionId, out ChannelReader<TEvent> reader)
    {
        var userCount = subscribers.Values.Count(subscriber => subscriber.UserId == userId);
        if (userCount >= MaxSubscriptionsPerUser)
        {
            return Reject(out subscriptionId, out reader);
        }

        var newCount = Interlocked.Increment(ref subscriptionCount);
        if (newCount > MaxConcurrentSubscriptions)
        {
            Interlocked.Decrement(ref subscriptionCount);
            return Reject(out subscriptionId, out reader);
        }

        subscriptionId = Guid.NewGuid();
        var channel = Channel.CreateBounded<TEvent>(new BoundedChannelOptions(PerSubscriberBufferSize)
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
            return Reject(out subscriptionId, out reader);
        }

        reader = channel.Reader;
        return true;
    }

    /** Releases a subscription and completes its channel. */
    public void Unsubscribe(Guid subscriptionId)
    {
        if (subscribers.TryRemove(subscriptionId, out var entry))
        {
            entry.Channel.Writer.TryComplete();
            Interlocked.Decrement(ref subscriptionCount);
        }
    }

    /** Delivers an event to every subscriber, dropping channels whose reader has already completed. */
    public void Publish(TEvent updateEvent)
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

    /** Produces the rejected-subscription result shape. */
    private static bool Reject(out Guid subscriptionId, out ChannelReader<TEvent> reader)
    {
        subscriptionId = Guid.Empty;
        reader = null!;
        return false;
    }
}
