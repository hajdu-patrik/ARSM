using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AutoService.UnitTests.Authorization;

/** Logout carries no authorization requirement, so an expired access cookie can still end the refresh session (K2). */
public sealed class AuthRouteAuthorizationTests
{
    private static List<RouteEndpoint> MapRoutes()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddDbContext<AutoServiceDbContext>(o => o.UseNpgsql("Host=unused;Database=unused"));
        builder.Services.AddIdentityCore<IdentityUser>().AddSignInManager();
        builder.Services.AddSingleton<IJwtTokenIssuer>(_ => throw new NotSupportedException());
        builder.Services.AddSingleton<ITokenDenylistService>(_ => throw new NotSupportedException());
        var app = builder.Build();

        app.MapAuthEndpoints();

        return ((IEndpointRouteBuilder)app).DataSources
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>()
            .ToList();
    }

    private static RouteEndpoint Route(List<RouteEndpoint> routes, string method, string pattern) =>
        routes.Single(r => r.RoutePattern.RawText == pattern
            && r.Metadata.GetMetadata<HttpMethodMetadata>()!.HttpMethods.Single() == method);

    private static bool RequiresAuthorization(Endpoint endpoint) =>
        endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>().Count > 0;

    [Fact]
    public void Logout_requires_no_authorization()
    {
        var logout = Route(MapRoutes(), "POST", "/api/auth/logout");

        Assert.False(RequiresAuthorization(logout));
    }

    [Fact]
    public void The_other_auth_routes_keep_their_authorization_requirements()
    {
        var routes = MapRoutes();

        Assert.True(RequiresAuthorization(Route(routes, "GET", "/api/auth/validate")));
        Assert.True(RequiresAuthorization(Route(routes, "POST", "/api/auth/register")));
        Assert.False(RequiresAuthorization(Route(routes, "POST", "/api/auth/login")));
        Assert.False(RequiresAuthorization(Route(routes, "POST", "/api/auth/refresh")));
    }
}
