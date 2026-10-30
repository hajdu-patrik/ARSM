using System.Security.Claims;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Middleware;
using Microsoft.AspNetCore.Http;
using static AutoService.UnitTests.Middleware.MiddlewareTestSupport;

namespace AutoService.UnitTests.Middleware;

/** A session on a temporary password may only reach the four whitelisted /api routes. */
public sealed class PasswordChangeRequiredMiddlewareTests
{
    private static ClaimsPrincipal Principal(string claimValue = PasswordChangeRequiredClaim.Value) =>
        new(new ClaimsIdentity([new Claim(PasswordChangeRequiredClaim.Type, claimValue)], "test"));

    private static async Task<(DefaultHttpContext Context, bool NextCalled)> SendAsync(string path, ClaimsPrincipal? user)
    {
        var next = new NextProbe();
        var context = Create("GET", path, user: user);

        await new PasswordChangeRequiredMiddleware(next.Delegate).InvokeAsync(context);

        return (context, next.Called);
    }

    [Theory]
    [InlineData("/api/customers")]
    [InlineData("/api/profile")]
    [InlineData("/api/auth/register")]
    [InlineData("/api/profile/change-password/extra")]
    public async Task A_temporary_password_session_is_refused_on_any_other_api_route(string path)
    {
        var (context, nextCalled) = await SendAsync(path, Principal());

        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
        Assert.Equal("password_change_required", ReadJson(context).GetProperty("code").GetString());
    }

    [Theory]
    [InlineData("/api/profile/change-password")]
    [InlineData("/api/auth/logout")]
    [InlineData("/api/auth/refresh")]
    [InlineData("/api/auth/validate")]
    [InlineData("/API/Auth/Logout")]
    public async Task The_four_whitelisted_routes_stay_reachable(string path)
    {
        var (_, nextCalled) = await SendAsync(path, Principal());

        Assert.True(nextCalled);
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/openapi/v1.json")]
    [InlineData("/apix")]
    public async Task Paths_outside_the_api_are_never_gated(string path)
    {
        var (_, nextCalled) = await SendAsync(path, Principal());

        Assert.True(nextCalled);
    }

    [Fact]
    public async Task A_normal_session_passes_everywhere()
    {
        var normal = new ClaimsPrincipal(new ClaimsIdentity([new Claim("person_type", "mechanic")], "test"));

        var (_, nextCalled) = await SendAsync("/api/customers", normal);

        Assert.True(nextCalled);
    }

    [Fact]
    public async Task An_anonymous_request_passes_for_the_authorization_layer_to_decide()
    {
        var (_, nextCalled) = await SendAsync("/api/customers", user: null);

        Assert.True(nextCalled);
    }

    [Fact]
    public async Task Only_the_exact_claim_value_gates_the_session()
    {
        var (_, nextCalled) = await SendAsync("/api/customers", Principal(claimValue: "false"));

        Assert.True(nextCalled);
    }
}
