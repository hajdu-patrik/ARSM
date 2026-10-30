using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Middleware;
using Microsoft.AspNetCore.Http;
using static AutoService.UnitTests.Middleware.MiddlewareTestSupport;

namespace AutoService.UnitTests.Middleware;

/** Unsafe cookie-bearing API requests need the CSRF header to equal the CSRF cookie; login and safe requests are exempt. */
public sealed class CsrfDoubleSubmitMiddlewareTests
{
    private static string Cookies(string? csrf = "tok-1") =>
        MiddlewareTestSupport.AuthCookie + (csrf is null ? string.Empty : $"; {AuthCookieNames.CsrfToken}={csrf}");

    private static async Task<(DefaultHttpContext Context, bool NextCalled)> SendAsync(
        string method, string path, string? cookies, string? header)
    {
        var next = new NextProbe();
        var context = Create(method, path, cookies);

        if (header is not null)
        {
            context.Request.Headers[AuthCookieNames.CsrfHeaderName] = header;
        }

        await new CsrfDoubleSubmitMiddleware(next.Delegate).InvokeAsync(context);

        return (context, next.Called);
    }

    [Fact]
    public async Task A_matching_header_and_cookie_passes_through()
    {
        var (context, nextCalled) = await SendAsync("POST", "/api/customers", Cookies("tok-1"), "tok-1");

        Assert.True(nextCalled);
        Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode);
    }

    [Theory]
    [InlineData("POST")]
    [InlineData("PUT")]
    [InlineData("PATCH")]
    [InlineData("DELETE")]
    public async Task Every_unsafe_method_without_the_header_is_refused_with_the_csrf_code(string method)
    {
        var (context, nextCalled) = await SendAsync(method, "/api/customers/1", Cookies(), header: null);

        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
        var body = ReadJson(context);
        Assert.Equal("csrf_token_invalid", body.GetProperty("code").GetString());
        Assert.Equal("Forbidden", body.GetProperty("title").GetString());
        Assert.Equal(403, body.GetProperty("status").GetInt32());
    }

    [Theory]
    [InlineData("tok-1", "tok-2")]
    [InlineData("tok-1", "TOK-1")]
    [InlineData("tok-1", "tok-1 ")]
    [InlineData("tok-1", "")]
    public async Task A_wrong_or_empty_header_is_refused(string cookieToken, string headerToken)
    {
        var (context, nextCalled) = await SendAsync("POST", "/api/customers", Cookies(cookieToken), headerToken);

        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
    }

    [Fact]
    public async Task A_missing_csrf_cookie_is_refused_even_with_a_header()
    {
        var (context, nextCalled) = await SendAsync("POST", "/api/customers", Cookies(csrf: null), "tok-1");

        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
    }

    [Fact]
    public async Task A_refresh_cookie_alone_also_needs_the_proof()
    {
        var cookies = $"{AuthCookieNames.RefreshToken}=refresh";

        var (context, nextCalled) = await SendAsync("POST", "/api/auth/refresh", cookies, header: null);

        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
    }

    [Theory]
    [InlineData("/api/auth/login")]
    [InlineData("/API/AUTH/LOGIN")]
    public async Task Login_is_exempt_even_with_cookies_and_no_header(string path)
    {
        var (_, nextCalled) = await SendAsync("POST", path, Cookies(), header: null);

        Assert.True(nextCalled);
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("HEAD")]
    [InlineData("OPTIONS")]
    public async Task Safe_methods_need_no_proof(string method)
    {
        var (_, nextCalled) = await SendAsync(method, "/api/customers", Cookies(), header: null);

        Assert.True(nextCalled);
    }

    [Fact]
    public async Task Requests_without_auth_cookies_need_no_proof()
    {
        var (_, nextCalled) = await SendAsync("POST", "/api/customers", cookies: null, header: null);

        Assert.True(nextCalled);
    }

    [Fact]
    public async Task Paths_outside_the_api_need_no_proof()
    {
        var (_, nextCalled) = await SendAsync("POST", "/something-else", Cookies(), header: null);

        Assert.True(nextCalled);
    }
}
