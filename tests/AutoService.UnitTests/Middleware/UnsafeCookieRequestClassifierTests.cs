using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Middleware;
using static AutoService.UnitTests.Middleware.MiddlewareTestSupport;

namespace AutoService.UnitTests.Middleware;

/** The shared rule both proof layers use: unsafe method, /api path and an auth cookie, all three. */
public sealed class UnsafeCookieRequestClassifierTests
{
    [Theory]
    [InlineData("POST", true)]
    [InlineData("PUT", true)]
    [InlineData("PATCH", true)]
    [InlineData("DELETE", true)]
    [InlineData("post", true)]
    [InlineData("GET", false)]
    [InlineData("HEAD", false)]
    [InlineData("OPTIONS", false)]
    [InlineData("TRACE", false)]
    public void Only_post_put_patch_and_delete_are_unsafe(string method, bool expected)
    {
        Assert.Equal(expected, UnsafeCookieRequestClassifier.IsUnsafeMethod(method));
    }

    [Theory]
    [InlineData("__Host-arsm-access-token=a", true)]
    [InlineData("__Host-arsm-refresh-token=r", true)]
    [InlineData("__Host-arsm-access-token=a; __Host-arsm-refresh-token=r", true)]
    [InlineData("__Host-arsm-csrf-token=c", false)]
    [InlineData("__Host-autoservice_at=legacy", false)]
    [InlineData("theme=dark", false)]
    public void Only_the_access_and_refresh_cookies_count_as_an_auth_cookie(string cookies, bool expected)
    {
        Assert.Equal(expected, UnsafeCookieRequestClassifier.HasAuthCookie(Create("POST", "/api/x", cookies)));
    }

    [Fact]
    public void A_request_without_any_cookie_has_no_auth_cookie()
    {
        Assert.False(UnsafeCookieRequestClassifier.HasAuthCookie(Create("POST", "/api/x")));
    }

    [Theory]
    [InlineData("POST", "/api/customers", true)]
    [InlineData("DELETE", "/API/customers/3", true)]
    [InlineData("POST", "/api", true)]
    [InlineData("POST", "/apix/customers", false)]
    [InlineData("POST", "/health", false)]
    [InlineData("GET", "/api/customers", false)]
    public void The_full_rule_needs_an_api_path_and_an_unsafe_method_with_the_auth_cookie(string method, string path, bool expected)
    {
        var context = Create(method, path, $"{AuthCookieNames.AccessToken}=a");

        Assert.Equal(expected, UnsafeCookieRequestClassifier.IsUnsafeCookieBearingApiRequest(context));
    }

    [Fact]
    public void An_unsafe_api_request_without_an_auth_cookie_is_not_cookie_bearing()
    {
        Assert.False(UnsafeCookieRequestClassifier.IsUnsafeCookieBearingApiRequest(Create("POST", "/api/customers")));
    }
}
