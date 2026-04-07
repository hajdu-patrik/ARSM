using Microsoft.AspNetCore.Routing;

namespace AutoService.ApiService.Vehicles;

/**
 * Registers vehicle routes under nested /api/customers/{customerId}/vehicles
 * and flat /api/vehicles.
 * Handler logic is split into dedicated partial files.
 */
public static partial class VehicleEndpoints
{
    public static IEndpointRouteBuilder MapVehicleEndpoints(this IEndpointRouteBuilder endpoints)
    {
        // Nested routes scoped to a customer.
        var nested = endpoints.MapGroup("/api/customers/{customerId:int}/vehicles")
            .WithTags("Vehicles")
            .RequireAuthorization();

        nested.MapGet("/", ListCustomerVehiclesAsync);
        nested.MapPost("/", CreateVehicleAsync).RequireAuthorization("AdminOnly");

        // Flat routes for single-vehicle operations.
        var flat = endpoints.MapGroup("/api/vehicles")
            .WithTags("Vehicles")
            .RequireAuthorization();

        flat.MapGet("/{id:int}", GetVehicleAsync);
        flat.MapPut("/{id:int}", UpdateVehicleAsync).RequireAuthorization("AdminOnly");
        flat.MapDelete("/{id:int}", DeleteVehicleAsync).RequireAuthorization("AdminOnly");

        return endpoints;
    }
}
