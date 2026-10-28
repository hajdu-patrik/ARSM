using System.Security.Claims;
using System.Threading.RateLimiting;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Security;
using Microsoft.AspNetCore.Http;

namespace AutoService.UnitTests.Security;

/** The per-person limits of the expensive routes, proven with the production numbers and the Development relaxation. */
public sealed class RateLimitPoliciesTests
{
    private static HttpContext PersonContext(int personId)
    {
        var identity = new ClaimsIdentity([new Claim(PersonIdClaim.Type, personId.ToString())], "test");
        return new DefaultHttpContext { User = new ClaimsPrincipal(identity) };
    }

    private static int CountGranted(Func<HttpContext, RateLimitLease> acquire, HttpContext context, int attempts)
    {
        var granted = 0;
        for (var i = 0; i < attempts; i++)
        {
            using var lease = acquire(context);
            granted += lease.IsAcquired ? 1 : 0;
        }

        return granted;
    }

    private static Func<HttpContext, RateLimitLease> Limiter(
        Func<HttpContext, bool, RateLimitPartition<string>> partitionOf, bool isDevelopment, List<RateLimiter> created)
    {
        var limiters = new Dictionary<string, RateLimiter>();
        return context =>
        {
            var partition = partitionOf(context, isDevelopment);
            if (!limiters.TryGetValue(partition.PartitionKey, out var limiter))
            {
                limiter = partition.Factory(partition.PartitionKey);
                limiters[partition.PartitionKey] = limiter;
                created.Add(limiter);
            }

            return limiter.AttemptAcquire();
        };
    }

    [Fact]
    public void One_person_gets_30_quote_pdf_renders_and_the_31st_is_refused()
    {
        var created = new List<RateLimiter>();
        var acquire = Limiter(RateLimitPolicies.QuotePdfPartition, false, created);

        Assert.Equal(30, CountGranted(acquire, PersonContext(1), 31));
        created.ForEach(limiter => limiter.Dispose());
    }

    [Fact]
    public void One_person_gets_30_company_reports_and_the_31st_is_refused()
    {
        var created = new List<RateLimiter>();
        var acquire = Limiter(RateLimitPolicies.CompanyResultPartition, false, created);

        Assert.Equal(30, CountGranted(acquire, PersonContext(1), 31));
        created.ForEach(limiter => limiter.Dispose());
    }

    [Fact]
    public void Another_persons_partition_is_independent()
    {
        var created = new List<RateLimiter>();
        var acquire = Limiter(RateLimitPolicies.QuotePdfPartition, false, created);

        Assert.Equal(30, CountGranted(acquire, PersonContext(1), 40));
        Assert.Equal(30, CountGranted(acquire, PersonContext(2), 40));
        created.ForEach(limiter => limiter.Dispose());
    }

    [Fact]
    public void Development_relaxes_the_pdf_and_report_limits_to_300()
    {
        var created = new List<RateLimiter>();
        var pdf = Limiter(RateLimitPolicies.QuotePdfPartition, true, created);
        var report = Limiter(RateLimitPolicies.CompanyResultPartition, true, created);

        Assert.Equal(300, CountGranted(pdf, PersonContext(1), 301));
        Assert.Equal(300, CountGranted(report, PersonContext(1), 301));
        created.ForEach(limiter => limiter.Dispose());
    }

    [Fact]
    public void The_sent_limiter_grants_20_sends_per_person_and_refuses_the_21st()
    {
        using var limiter = new QuoteSendRateLimiter(isDevelopment: false);

        Assert.Equal(20, CountGranted(limiter.Acquire, PersonContext(1), 21));
    }

    [Fact]
    public void The_sent_limiter_keeps_one_partition_per_person()
    {
        using var limiter = new QuoteSendRateLimiter(isDevelopment: false);

        Assert.Equal(20, CountGranted(limiter.Acquire, PersonContext(1), 25));
        Assert.Equal(20, CountGranted(limiter.Acquire, PersonContext(2), 25));
    }

    [Fact]
    public void The_sent_limiter_window_is_one_hour_in_production()
    {
        Assert.Equal(TimeSpan.FromHours(1), QuoteSendRateLimiter.SendWindow);
        Assert.Equal(20, QuoteSendRateLimiter.SendPermitLimit);
    }

    [Fact]
    public void Development_relaxes_the_sent_limiter_to_300()
    {
        using var limiter = new QuoteSendRateLimiter(isDevelopment: true);

        Assert.Equal(300, CountGranted(limiter.Acquire, PersonContext(1), 301));
    }
}
