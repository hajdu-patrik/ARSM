using System.Threading.RateLimiting;

namespace AutoService.ApiService.Security;

/** The hourly per-person limit of quote sends: a route policy cannot tell Sent from Accepted (the status is in the body),
    so the handler takes one permit right before the PDF render and the mail. */
internal sealed class QuoteSendRateLimiter : IDisposable
{
    internal const int SendPermitLimit = 20;
    internal static readonly TimeSpan SendWindow = TimeSpan.FromHours(1);

    private readonly PartitionedRateLimiter<HttpContext> limiter;

    internal QuoteSendRateLimiter(bool isDevelopment)
    {
        // Development keeps the one-minute window, so the local suites never wait an hour for a permit.
        var permitLimit = RateLimitPolicies.Relaxed(SendPermitLimit, isDevelopment);
        TimeSpan? window = isDevelopment ? TimeSpan.FromMinutes(1) : SendWindow;

        limiter = PartitionedRateLimiter.Create<HttpContext, string>(
            context => RateLimitPolicies.PerPerson(context, permitLimit, window));
    }

    /** Takes one send permit for the signed-in person; the caller disposes the lease and answers 429 when it is refused. */
    internal RateLimitLease Acquire(HttpContext context) => limiter.AttemptAcquire(context);

    public void Dispose() => limiter.Dispose();
}
