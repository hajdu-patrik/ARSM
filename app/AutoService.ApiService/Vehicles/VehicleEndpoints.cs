/**
 * VehicleEndpoints.cs
 *
 * Auto-generated documentation header for this source file.
 */

using Microsoft.AspNetCore.Routing;

namespace AutoService.ApiService.Vehicles;

/**
 * Registers vehicle routes under nested /api/customers/{customerId}/vehicles
 * and flat /api/vehicles.
 * Handler logic is split into dedicated partial files.
 */
public static partial class VehicleEndpoints
{
        /**
         * MapVehicleEndpoints operation.
         *
         * @param endpoints Parameter.
         * @returns Return value.
         */
        public static IEndpointRouteBuilder MapVehicleEndpoints(this IEndpointRouteBuilder endpoints)
    {
        // Nested routes scoped to a customer.
        var nested = endpoints.MapGroup("/api/customers/{customerId:int}/vehicles")
            .WithTags("Vehicles")
            .RequireAuthorization();

            nested.MapGet("/", ListCustomerVehiclesAsync)
                .Produces<List<VehicleDetailDto>>(StatusCodes.Status200OK)
                .Produces(StatusCodes.Status401Unauthorized)
                .ProducesProblem(StatusCodes.Status404NotFound);

            nested.MapPost("/", CreateVehicleAsync)
                .RequireAuthorization("AdminOnly")
                .Produces<VehicleDetailDto>(StatusCodes.Status201Created)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces(StatusCodes.Status403Forbidden)
                .ProducesProblem(StatusCodes.Status404NotFound)
                .ProducesProblem(StatusCodes.Status409Conflict)
                .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        // Flat routes for single-vehicle operations.
        var flat = endpoints.MapGroup("/api/vehicles")
            .WithTags("Vehicles")
            .RequireAuthorization();

        flat.MapGet("/{id:int}", GetVehicleAsync)
            .Produces<VehicleDetailDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        flat.MapPut("/{id:int}", UpdateVehicleAsync)
            .RequireAuthorization("AdminOnly")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        flat.MapDelete("/{id:int}", DeleteVehicleAsync)
            .RequireAuthorization("AdminOnly")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return endpoints;
    }
}
