using AutoService.ApiService.Middleware;
using Microsoft.AspNetCore.Http;

namespace AutoService.UnitTests.Middleware;

/** The shared login-route rule: case-insensitive, one optional trailing slash, nothing longer. */
public sealed class LoginPathMatcherTests
{
    [Theory]
    [InlineData("/api/auth/login")]
    [InlineData("/api/auth/login/")]
    [InlineData("/API/AUTH/LOGIN")]
    [InlineData("/API/AUTH/LOGIN/")]
    [InlineData("/Api/Auth/Login")]
    public void The_login_route_matches_with_or_without_a_trailing_slash_in_any_case(string path)
    {
        Assert.True(LoginPathMatcher.IsLoginPath(new PathString(path)));
    }

    [Theory]
    [InlineData("/api/auth/login/x")]
    [InlineData("/api/auth/loginx")]
    [InlineData("/api/auth/login//")]
    [InlineData("/api/auth/refresh")]
    [InlineData("")]
    public void Any_other_path_does_not_match(string path)
    {
        Assert.False(LoginPathMatcher.IsLoginPath(new PathString(path)));
    }
}
