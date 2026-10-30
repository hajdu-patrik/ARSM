using System.Security.Claims;
using System.Text;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Realtime;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;

namespace AutoService.UnitTests.Realtime;

/** The shared SSE writer: frame format, headers, capacity 503 and the three ways a stream ends. */
public sealed class ServerSentEventStreamTests
{
    private sealed record TestEvent(int AppointmentId, string Note);

    private sealed class TestBroadcaster(int perUser = 5) : UpdateBroadcaster<TestEvent>
    {
        protected override int MaxSubscriptionsPerUser => perUser;
    }

    /** A write-only body that lets a test wait until a fragment was written. */
    private sealed class CaptureStream : Stream
    {
        private readonly object gate = new();
        private readonly StringBuilder text = new();

        public string Text
        {
            get
            {
                lock (gate)
                {
                    return text.ToString();
                }
            }
        }

        public async Task WaitForAsync(string fragment)
        {
            var deadline = DateTime.UtcNow.AddSeconds(5);
            while (!Text.Contains(fragment, StringComparison.Ordinal))
            {
                if (DateTime.UtcNow > deadline)
                {
                    throw new TimeoutException($"'{fragment}' was not written; got '{Text}'.");
                }

                await Task.Delay(10);
            }
        }

        public override void Write(byte[] buffer, int offset, int count) => Append(buffer.AsSpan(offset, count));

        public override void Write(ReadOnlySpan<byte> buffer) => Append(buffer);

        public override ValueTask WriteAsync(ReadOnlyMemory<byte> buffer, CancellationToken cancellationToken = default)
        {
            Append(buffer.Span);
            return ValueTask.CompletedTask;
        }

        private void Append(ReadOnlySpan<byte> bytes)
        {
            lock (gate)
            {
                text.Append(Encoding.UTF8.GetString(bytes));
            }
        }

        public override void Flush()
        {
        }

        public override bool CanRead => false;

        public override bool CanSeek => false;

        public override bool CanWrite => true;

        public override long Length => throw new NotSupportedException();

        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();
    }

    private static (DefaultHttpContext Context, CaptureStream Body) NewContext(string? personId = "7")
    {
        var body = new CaptureStream();
        var context = new DefaultHttpContext();
        context.Response.Body = body;

        if (personId is not null)
        {
            context.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(PersonIdClaim.Type, personId)], "test"));
        }

        return (context, body);
    }

    private static Task<IResult> Serve(HttpContext context, TestBroadcaster broadcaster, CancellationToken token)
        => ServerSentEventStream.ServeAsync(context, broadcaster, "appointment-updated", "ready", "Too many live streams.", token);

    [Fact]
    public async Task The_stream_announces_readiness_sets_the_sse_headers_and_writes_camel_case_frames()
    {
        var (context, body) = NewContext();
        var broadcaster = new TestBroadcaster();
        using var cts = new CancellationTokenSource();

        var serving = Serve(context, broadcaster, cts.Token);
        await body.WaitForAsync(": ready\n\n");
        broadcaster.Publish(new TestEvent(5, "x"));
        await body.WaitForAsync("event: appointment-updated\ndata: {\"appointmentId\":5,\"note\":\"x\"}\n\n");
        cts.Cancel();

        Assert.Same(Results.Empty, await serving.WaitAsync(TimeSpan.FromSeconds(5)));
        Assert.Equal("no-cache", context.Response.Headers.CacheControl.ToString());
        Assert.Equal("no", context.Response.Headers["X-Accel-Buffering"].ToString());
        Assert.Equal("text/event-stream", context.Response.ContentType);
    }

    [Fact]
    public async Task Events_published_in_a_burst_arrive_in_order()
    {
        var (context, body) = NewContext();
        var broadcaster = new TestBroadcaster();
        using var cts = new CancellationTokenSource();

        var serving = Serve(context, broadcaster, cts.Token);
        await body.WaitForAsync(": ready\n\n");
        broadcaster.Publish(new TestEvent(1, "a"));
        broadcaster.Publish(new TestEvent(2, "b"));
        await body.WaitForAsync("\"appointmentId\":2");
        cts.Cancel();
        await serving.WaitAsync(TimeSpan.FromSeconds(5));

        Assert.True(body.Text.IndexOf("\"appointmentId\":1", StringComparison.Ordinal) < body.Text.IndexOf("\"appointmentId\":2", StringComparison.Ordinal));
    }

    [Fact]
    public async Task A_client_disconnect_ends_the_stream_and_releases_the_subscription()
    {
        var (context, body) = NewContext();
        var broadcaster = new TestBroadcaster(perUser: 1);
        using var cts = new CancellationTokenSource();

        var serving = Serve(context, broadcaster, cts.Token);
        await body.WaitForAsync(": ready\n\n");
        Assert.False(broadcaster.TrySubscribe(7, out _, out _));
        cts.Cancel();
        await serving.WaitAsync(TimeSpan.FromSeconds(5));

        Assert.True(broadcaster.TrySubscribe(7, out _, out _));
    }

    [Fact]
    public async Task A_session_revocation_closes_the_stream_without_a_client_disconnect()
    {
        var (context, body) = NewContext(personId: "7");
        var broadcaster = new TestBroadcaster(perUser: 1);

        var serving = Serve(context, broadcaster, CancellationToken.None);
        await body.WaitForAsync(": ready\n\n");
        broadcaster.DisconnectUser(7);

        Assert.Same(Results.Empty, await serving.WaitAsync(TimeSpan.FromSeconds(5)));
        Assert.True(broadcaster.TrySubscribe(7, out _, out _));
    }

    [Fact]
    public async Task A_caller_without_a_person_claim_streams_under_user_zero()
    {
        var (context, body) = NewContext(personId: null);
        var broadcaster = new TestBroadcaster();

        var serving = Serve(context, broadcaster, CancellationToken.None);
        await body.WaitForAsync(": ready\n\n");
        broadcaster.DisconnectUser(0);

        Assert.Same(Results.Empty, await serving.WaitAsync(TimeSpan.FromSeconds(5)));
    }

    [Fact]
    public async Task At_capacity_the_answer_is_a_503_problem_and_the_response_stays_untouched()
    {
        var (context, body) = NewContext();
        var broadcaster = new TestBroadcaster(perUser: 1);
        Assert.True(broadcaster.TrySubscribe(7, out _, out _));

        var result = await Serve(context, broadcaster, CancellationToken.None);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, problem.StatusCode);
        Assert.Equal("Too many live streams.", problem.ProblemDetails.Detail);
        Assert.Null(context.Response.ContentType);
        Assert.Equal(string.Empty, body.Text);
    }
}
