using AutoService.ApiService.Appointments;
using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Customers;
using AutoService.ApiService.Data;
using AutoService.ApiService.Vehicles;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AutoService.UnitTests.Authorization;

/** Every appointment, customer and vehicle route requires MechanicOnly; the destructive and admin routes add AdminOnly. */
public sealed class MechanicOnlyRouteGroupsTests
{
    private static List<RouteEndpoint> MapRoutes()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddDbContext<AutoServiceDbContext>(o => o.UseNpgsql("Host=unused;Database=unused"));
        builder.Services.AddSingleton<IAppointmentUpdateBroadcaster, AppointmentUpdateBroadcaster>();
        var app = builder.Build();

        app.MapAppointmentEndpoints();
        app.MapCustomerEndpoints();
        app.MapVehicleEndpoints();

        return ((IEndpointRouteBuilder)app).DataSources
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>()
            .ToList();
    }

    private static HashSet<string> Policies(Endpoint endpoint) =>
        endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>()
            .Select(data => data.Policy)
            .OfType<string>()
            .ToHashSet();

    private static string Method(Endpoint endpoint) =>
        endpoint.Metadata.GetMetadata<HttpMethodMetadata>()!.HttpMethods.Single();

    private static bool NeedsAdmin(RouteEndpoint endpoint)
    {
        var method = Method(endpoint);
        var pattern = (endpoint.RoutePattern.RawText ?? string.Empty).TrimEnd('/');
        return method == "DELETE" && !pattern.EndsWith("/claim", StringComparison.Ordinal)
            || pattern.Contains("/assign/", StringComparison.Ordinal)
            || method == "POST" && pattern == "/api/customers/{customerId:int}/appointments";
    }

    [Fact]
    public void EveryRouteRequiresMechanicOnly()
    {
        var routes = MapRoutes();

        Assert.NotEmpty(routes);
        foreach (var route in routes)
        {
            Assert.True(Policies(route).Contains("MechanicOnly"), $"{Method(route)} {route.RoutePattern.RawText}");
        }
    }

    [Fact]
    public void AdminRoutesKeepAdminOnly()
    {
        var routes = MapRoutes();

        Assert.Contains(routes, NeedsAdmin);
        foreach (var route in routes)
        {
            Assert.True(
                NeedsAdmin(route) == Policies(route).Contains("AdminOnly"),
                $"{Method(route)} {route.RoutePattern.RawText}");
        }
    }
}
