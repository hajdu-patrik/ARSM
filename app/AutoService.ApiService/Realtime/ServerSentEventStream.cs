using System.Text.Json;
using System.Threading.Channels;

namespace AutoService.ApiService.Realtime;

/** Shared server-sent event writer for the live update endpoints. Keeping this in one place means a second live channel does not mean a second copy of the keep-alive, idle-timeout and flush handling, which are easy to get subtly wrong. */
internal static class ServerSentEventStream
{
    /** camelCase matches what the browser clients parse. The static JsonSerializer call does not pick up the ASP.NET Core JSON options, so without this every frame would arrive PascalCased and the client-side parsers would drop it. */
    private static readonly JsonSerializerOptions PayloadJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /** How long a stream may stay silent before the server closes it. */
    private static readonly TimeSpan IdleTimeout = TimeSpan.FromMinutes(10);

    /** How often a comment frame is written while no event arrives, to keep proxies from closing the stream. */
    private static readonly TimeSpan KeepAliveInterval = TimeSpan.FromSeconds(20);

    /** Distinguishes a closed channel from a keep-alive tick. */
    private enum ReadState
    {
        Available,
        TimedOut,
        Closed
    }

    /** Applies the response headers an SSE stream needs before the first write. */
    public static void ConfigureResponse(HttpResponse response)
    {
        response.Headers.CacheControl = "no-cache";
        response.Headers.Append("X-Accel-Buffering", "no");
        response.ContentType = "text/event-stream";
    }

    /** Streams events until the channel closes, the client disconnects, or the idle timeout expires. */
    public static async Task WriteAsync<TEvent>(
        HttpResponse response,
        ChannelReader<TEvent> reader,
        string eventName,
        string readyComment,
        CancellationToken cancellationToken)
    {
        var idleDeadlineUtc = DateTime.UtcNow.Add(IdleTimeout);

        await WriteCommentAsync(response, readyComment, cancellationToken);

        while (!cancellationToken.IsCancellationRequested)
        {
            var readState = await WaitForNextAsync(reader, cancellationToken);

            if (readState == ReadState.Closed)
            {
                break;
            }

            if (readState == ReadState.TimedOut)
            {
                if (DateTime.UtcNow >= idleDeadlineUtc)
                {
                    break;
                }

                await WriteCommentAsync(response, "keep-alive", cancellationToken);
                continue;
            }

            idleDeadlineUtc = await DrainAsync(response, reader, eventName, idleDeadlineUtc, cancellationToken);
        }
    }

    /** Waits for the next event while distinguishing channel closure from a keep-alive tick. */
    private static async Task<ReadState> WaitForNextAsync<TEvent>(
        ChannelReader<TEvent> reader,
        CancellationToken cancellationToken)
    {
        using var readCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        readCts.CancelAfter(KeepAliveInterval);

        try
        {
            var hasData = await reader.WaitToReadAsync(readCts.Token);
            return hasData ? ReadState.Available : ReadState.Closed;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return ReadState.TimedOut;
        }
    }

    /** Writes every queued event and extends the idle deadline after each delivery. */
    private static async Task<DateTime> DrainAsync<TEvent>(
        HttpResponse response,
        ChannelReader<TEvent> reader,
        string eventName,
        DateTime idleDeadlineUtc,
        CancellationToken cancellationToken)
    {
        while (reader.TryRead(out var update))
        {
            var payload = JsonSerializer.Serialize(update, PayloadJsonOptions);
            await response.WriteAsync($"event: {eventName}\ndata: {payload}\n\n", cancellationToken);
            await response.Body.FlushAsync(cancellationToken);
            idleDeadlineUtc = DateTime.UtcNow.Add(IdleTimeout);
        }

        return idleDeadlineUtc;
    }

    /** Writes an SSE comment frame, used for readiness and keep-alive signalling. */
    private static async Task WriteCommentAsync(
        HttpResponse response,
        string comment,
        CancellationToken cancellationToken)
    {
        await response.WriteAsync($": {comment}\n\n", cancellationToken);
        await response.Body.FlushAsync(cancellationToken);
    }
}
