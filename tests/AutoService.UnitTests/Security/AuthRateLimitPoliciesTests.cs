using System.Net;
using System.Security.Claims;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Middleware;
using AutoService.ApiService.Security;
using AutoService.UnitTests.Configuration;
using AutoService.UnitTests.Middleware;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using static AutoService.UnitTests.Middleware.MiddlewareTestSupport;

namespace AutoService.UnitTests.Security;

/** Login, refresh and picture-upload limits, driven through the production registration and UseRateLimiter. */
public sealed class AuthRateLimitPoliciesTests
{
    private const string LoginPath = "/api/auth/login";
    private const string RefreshPath = "/api/auth/refresh";
    private const string PicturePath = "/api/profile/picture";

    private static int addressCounter;

    private static IPAddress UniqueIp()
    {
        var n = Interlocked.Increment(ref addressCounter);
        return new IPAddress(new byte[] { 10, 88, (byte)(n >> 8), (byte)n });
    }

    private static ClaimsPrincipal Person(int personId)
        => new(new ClaimsIdentity([new Claim(PersonIdClaim.Type, personId.ToString())], "test"));

    /** One production-registered rate limiter pipeline in front of a route that carries the named policy. */
    private sealed class LimitedRoute : IDisposable
    {
        private readonly ServiceProvider provider;
        private readonly RequestDelegate pipeline;
        private readonly Endpoint endpoint;
        private readonly string method;
        private readonly string path;

        public LimitedRoute(string policy, string method, string path, IHostEnvironment environment)
        {
            provider = new ServiceCollection().AddLogging().AddMetrics().AddArsmRateLimiting(environment).BuildServiceProvider();
            var app = new ApplicationBuilder(provider);
            app.UseRateLimiter();
            app.Run(_ => Task.CompletedTask);
            pipeline = app.Build();
            endpoint = new Endpoint(null, new EndpointMetadataCollection(new EnableRateLimitingAttribute(policy)), policy);
            this.method = method;
            this.path = path;
        }

        public async Task<DefaultHttpContext> SendAsync(IPAddress ip, ClaimsPrincipal? user = null)
        {
            var context = Create(method, path, remoteIp: ip, user: user);
            context.SetEndpoint(endpoint);
            await pipeline(context);
            return context;
        }

        public async Task<List<int>> SendManyAsync(int count, IPAddress ip, ClaimsPrincipal? user = null)
        {
            var statuses = new List<int>();
            for (var i = 0; i < count; i++)
            {
                statuses.Add((await SendAsync(ip, user)).Response.StatusCode);
            }

            return statuses;
        }

        public void Dispose() => provider.Dispose();
    }

    private static LimitedRoute Login(IHostEnvironment environment)
        => new(RateLimitPolicies.AuthLogin, "POST", LoginPath, environment);

    private static LimitedRoute Refresh(IHostEnvironment environment)
        => new(RateLimitPolicies.AuthRefresh, "POST", RefreshPath, environment);

    private static LimitedRoute Picture(IHostEnvironment environment)
        => new(RateLimitPolicies.ProfilePictureUpload, "PUT", PicturePath, environment);

    private static async Task<DefaultHttpContext> PassThroughLoginBanAsync(IPAddress ip, NextProbe next)
    {
        var context = Create("POST", LoginPath, remoteIp: ip);
        await new LoginBanMiddleware(next.Delegate).InvokeAsync(context);
        return context;
    }

    [Fact]
    public async Task One_client_gets_10_logins_per_minute_and_the_11th_is_refused_with_429()
    {
        using var route = Login(FakeHostEnvironment.Production);

        var statuses = await route.SendManyAsync(11, UniqueIp());

        Assert.Equal(10, statuses.Count(status => status == StatusCodes.Status200OK));
        Assert.Equal(StatusCodes.Status429TooManyRequests, statuses[10]);
    }

    [Fact]
    public async Task The_refused_login_carries_retry_after_180_and_the_login_rate_limited_body()
    {
        using var route = Login(FakeHostEnvironment.Production);
        var ip = UniqueIp();
        await route.SendManyAsync(10, ip);

        var refused = await route.SendAsync(ip);

        Assert.Equal(StatusCodes.Status429TooManyRequests, refused.Response.StatusCode);
        Assert.Equal("180", refused.Response.Headers.RetryAfter.ToString());
        var body = ReadJson(refused);
        Assert.Equal("login_rate_limited", body.GetProperty("code").GetString());
        Assert.Equal("Too many login attempts. Try again in 3 minutes!", body.GetProperty("error").GetString());
        Assert.Equal(180, body.GetProperty("retryAfterSeconds").GetInt32());
    }

    [Fact]
    public async Task The_login_rejection_bans_the_client_so_the_next_login_answers_login_banned()
    {
        using var route = Login(FakeHostEnvironment.Production);
        var ip = UniqueIp();
        await route.SendManyAsync(11, ip);
        var next = new NextProbe();

        var banned = await PassThroughLoginBanAsync(ip, next);

        Assert.False(next.Called);
        Assert.Equal(StatusCodes.Status429TooManyRequests, banned.Response.StatusCode);
        Assert.Equal("login_banned", ReadJson(banned).GetProperty("code").GetString());
    }

    [Fact]
    public async Task A_login_rejection_leaves_another_client_unbanned_and_unlimited()
    {
        using var route = Login(FakeHostEnvironment.Production);
        await route.SendManyAsync(11, UniqueIp());
        var otherIp = UniqueIp();
        var next = new NextProbe();

        var other = await route.SendAsync(otherIp);
        await PassThroughLoginBanAsync(otherIp, next);

        Assert.Equal(StatusCodes.Status200OK, other.Response.StatusCode);
        Assert.True(next.Called);
    }

    [Fact]
    public async Task Development_relaxes_the_login_limit_to_300()
    {
        using var route = Login(FakeHostEnvironment.Development);

        var statuses = await route.SendManyAsync(301, UniqueIp());

        Assert.Equal(300, statuses.Count(status => status == StatusCodes.Status200OK));
        Assert.Equal(StatusCodes.Status429TooManyRequests, statuses[300]);
    }

    [Fact]
    public async Task One_client_gets_20_refreshes_per_minute_and_the_21st_is_refused_with_a_bodiless_429()
    {
        using var route = Refresh(FakeHostEnvironment.Production);
        var ip = UniqueIp();
        var statuses = await route.SendManyAsync(20, ip);

        var refused = await route.SendAsync(ip);

        Assert.All(statuses, status => Assert.Equal(StatusCodes.Status200OK, status));
        Assert.Equal(StatusCodes.Status429TooManyRequests, refused.Response.StatusCode);
        Assert.Equal(0, refused.Response.Body.Length);
        Assert.False(refused.Response.Headers.ContainsKey("Retry-After"));
    }

    [Fact]
    public async Task A_refused_refresh_does_not_ban_the_client_from_logging_in()
    {
        using var route = Refresh(FakeHostEnvironment.Production);
        var ip = UniqueIp();
        await route.SendManyAsync(21, ip);
        var next = new NextProbe();

        await PassThroughLoginBanAsync(ip, next);

        Assert.True(next.Called);
    }

    [Fact]
    public async Task Development_does_not_relax_the_refresh_limit()
    {
        using var route = Refresh(FakeHostEnvironment.Development);

        var statuses = await route.SendManyAsync(21, UniqueIp());

        Assert.Equal(20, statuses.Count(status => status == StatusCodes.Status200OK));
        Assert.Equal(StatusCodes.Status429TooManyRequests, statuses[20]);
    }

    [Fact]
    public async Task One_person_gets_10_picture_uploads_per_minute_and_the_11th_is_refused_with_a_bodiless_429()
    {
        using var route = Picture(FakeHostEnvironment.Production);
        var ip = UniqueIp();
        var statuses = await route.SendManyAsync(10, ip, Person(1));

        var refused = await route.SendAsync(ip, Person(1));

        Assert.All(statuses, status => Assert.Equal(StatusCodes.Status200OK, status));
        Assert.Equal(StatusCodes.Status429TooManyRequests, refused.Response.StatusCode);
        Assert.Equal(0, refused.Response.Body.Length);
    }

    [Fact]
    public async Task Another_persons_picture_uploads_have_their_own_partition()
    {
        using var route = Picture(FakeHostEnvironment.Production);
        var ip = UniqueIp();
        await route.SendManyAsync(11, ip, Person(1));

        var statuses = await route.SendManyAsync(11, ip, Person(2));

        Assert.Equal(10, statuses.Count(status => status == StatusCodes.Status200OK));
        Assert.Equal(StatusCodes.Status429TooManyRequests, statuses[10]);
    }

    [Fact]
    public async Task Development_relaxes_the_picture_upload_limit_to_300()
    {
        using var route = Picture(FakeHostEnvironment.Development);

        var statuses = await route.SendManyAsync(301, UniqueIp(), Person(1));

        Assert.Equal(300, statuses.Count(status => status == StatusCodes.Status200OK));
        Assert.Equal(StatusCodes.Status429TooManyRequests, statuses[300]);
    }
}
