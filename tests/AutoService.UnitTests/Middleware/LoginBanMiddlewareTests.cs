using System.Net;
using AutoService.ApiService.Middleware;
using Microsoft.AspNetCore.Http;
using static AutoService.UnitTests.Middleware.MiddlewareTestSupport;

namespace AutoService.UnitTests.Middleware;

/** The login ban is per client address and only guards the login route; each test uses its own address. */
public sealed class LoginBanMiddlewareTests
{
    private static int addressCounter;

    private static IPAddress UniqueIp()
    {
        var n = Interlocked.Increment(ref addressCounter);
        return new IPAddress(new byte[] { 10, 77, (byte)(n >> 8), (byte)n });
    }

    private static async Task<(DefaultHttpContext Context, bool NextCalled)> SendAsync(string path, IPAddress ip, string method = "POST")
    {
        var next = new NextProbe();
        var context = Create(method, path, remoteIp: ip);

        await new LoginBanMiddleware(next.Delegate).InvokeAsync(context);

        return (context, next.Called);
    }

    [Fact]
    public async Task A_client_that_was_never_banned_reaches_the_login_handler()
    {
        var (context, nextCalled) = await SendAsync("/api/auth/login", UniqueIp());

        Assert.True(nextCalled);
        Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode);
    }

    [Fact]
    public async Task A_banned_client_gets_429_with_the_ban_code_and_a_matching_retry_after()
    {
        var ip = UniqueIp();
        LoginBanMiddleware.BanClient(Create("POST", "/api/auth/login", remoteIp: ip));

        var (context, nextCalled) = await SendAsync("/api/auth/login", ip);

        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status429TooManyRequests, context.Response.StatusCode);
        var retryAfter = int.Parse(context.Response.Headers.RetryAfter.ToString());
        Assert.InRange(retryAfter, 170, LoginBanMiddleware.BanWindowSeconds);
        var body = ReadJson(context);
        Assert.Equal("login_banned", body.GetProperty("code").GetString());
        Assert.Equal("Too many login attempts. Try again in 3 minutes.", body.GetProperty("error").GetString());
        Assert.Equal(retryAfter, body.GetProperty("retryAfterSeconds").GetInt32());
    }

    [Fact]
    public async Task The_login_path_match_ignores_case()
    {
        var ip = UniqueIp();
        LoginBanMiddleware.BanClient(Create("POST", "/api/auth/login", remoteIp: ip));

        var (context, nextCalled) = await SendAsync("/API/Auth/LOGIN", ip);

        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status429TooManyRequests, context.Response.StatusCode);
    }

    [Fact]
    public async Task A_ban_does_not_touch_other_routes_of_the_same_client()
    {
        var ip = UniqueIp();
        LoginBanMiddleware.BanClient(Create("POST", "/api/auth/login", remoteIp: ip));

        var (_, refreshReached) = await SendAsync("/api/auth/refresh", ip);
        var (_, customersReached) = await SendAsync("/api/customers", ip, "GET");

        Assert.True(refreshReached);
        Assert.True(customersReached);
    }

    [Fact]
    public async Task A_ban_does_not_touch_another_client()
    {
        LoginBanMiddleware.BanClient(Create("POST", "/api/auth/login", remoteIp: UniqueIp()));

        var (_, nextCalled) = await SendAsync("/api/auth/login", UniqueIp());

        Assert.True(nextCalled);
    }

    [Fact]
    public void The_ban_window_is_three_minutes()
    {
        Assert.Equal(180, LoginBanMiddleware.BanWindowSeconds);
    }

    [Fact]
    public void The_client_key_is_the_remote_address_or_unknown_without_one()
    {
        Assert.Equal("203.0.113.9", LoginBanMiddleware.ResolveClientKey(Create("POST", "/", remoteIp: IPAddress.Parse("203.0.113.9"))));
        Assert.Equal("unknown", LoginBanMiddleware.ResolveClientKey(Create("POST", "/")));
    }
}
