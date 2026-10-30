using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Configuration;
using AutoService.ApiService.Middleware;
using AutoService.UnitTests.Configuration;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using static AutoService.UnitTests.Middleware.MiddlewareTestSupport;

namespace AutoService.UnitTests.Middleware;

/** Cookie-bearing unsafe API calls and every login POST need an Origin the WebUI policy allows. */
public sealed class UnsafeCookieRequestOriginMiddlewareTests
{
    private const string AllowedOrigin = "https://app.example.test";

    private static WebUiOriginPolicy Policy() => WebUiOriginPolicy.Create(
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Cors:AllowedOrigins:0"] = AllowedOrigin })
            .Build(),
        FakeHostEnvironment.Production);

    private static async Task<(DefaultHttpContext Context, bool NextCalled)> SendAsync(
        string method, string path, string? cookies, string? origin)
    {
        var next = new NextProbe();
        var context = Create(method, path, cookies, origin);

        await new UnsafeCookieRequestOriginMiddleware(next.Delegate, Policy()).InvokeAsync(context);

        return (context, next.Called);
    }

    [Fact]
    public async Task An_unsafe_cookie_request_from_the_allowed_origin_passes()
    {
        var (_, nextCalled) = await SendAsync("PUT", "/api/profile", AuthCookie, AllowedOrigin);

        Assert.True(nextCalled);
    }

    [Theory]
    [InlineData("https://evil.example.test")]
    [InlineData("http://app.example.test")]
    [InlineData("https://app.example.test:8443")]
    [InlineData("null")]
    [InlineData(null)]
    public async Task An_unsafe_cookie_request_from_any_other_or_missing_origin_is_refused(string? origin)
    {
        var (context, nextCalled) = await SendAsync("POST", "/api/customers", AuthCookie, origin);

        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
        var body = ReadJson(context);
        Assert.Equal(403, body.GetProperty("status").GetInt32());
        Assert.Equal("Unsafe authenticated API requests require an allowed Origin header.", body.GetProperty("detail").GetString());
        Assert.False(body.TryGetProperty("code", out _));
    }

    [Fact]
    public async Task A_refresh_cookie_alone_is_enough_to_require_the_origin()
    {
        var cookies = $"{AuthCookieNames.RefreshToken}=refresh";

        var (_, nextCalled) = await SendAsync("POST", "/api/auth/refresh", cookies, "https://evil.example.test");

        Assert.False(nextCalled);
    }

    [Fact]
    public async Task A_login_post_without_cookies_still_needs_the_allowed_origin()
    {
        var (blocked, blockedNext) = await SendAsync("POST", "/api/auth/login", cookies: null, "https://evil.example.test");
        var (_, allowedNext) = await SendAsync("POST", "/api/auth/login", cookies: null, AllowedOrigin);

        Assert.False(blockedNext);
        Assert.Equal(StatusCodes.Status403Forbidden, blocked.Response.StatusCode);
        Assert.True(allowedNext);
    }

    [Fact]
    public async Task The_login_rule_is_only_for_post_and_the_exact_login_path()
    {
        var (_, putReached) = await SendAsync("PUT", "/api/auth/login", cookies: null, "https://evil.example.test");
        var (_, otherPostReached) = await SendAsync("POST", "/api/auth/register-x", cookies: null, "https://evil.example.test");

        Assert.True(putReached);
        Assert.True(otherPostReached);
    }

    [Theory]
    [InlineData("GET", "/api/customers")]
    [InlineData("HEAD", "/api/customers")]
    [InlineData("POST", "/something-else")]
    public async Task Safe_methods_and_paths_outside_the_api_are_not_checked(string method, string path)
    {
        var (_, nextCalled) = await SendAsync(method, path, AuthCookie, "https://evil.example.test");

        Assert.True(nextCalled);
    }

    [Fact]
    public async Task An_unsafe_api_request_without_cookies_is_not_checked()
    {
        var (_, nextCalled) = await SendAsync("POST", "/api/customers", cookies: null, origin: null);

        Assert.True(nextCalled);
    }
}
