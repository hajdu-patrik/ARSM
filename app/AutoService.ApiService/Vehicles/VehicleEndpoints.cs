using AutoService.ApiService.Pagination;

namespace AutoService.ApiService.Vehicles;

/** Registers vehicle routes under nested /api/customers/{customerId}/vehicles and flat /api/vehicles; handler logic split into partial files. */
public static partial class VehicleEndpoints
{
    public static IEndpointRouteBuilder MapVehicleEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var nested = endpoints.MapGroup("/api/customers/{customerId:int}/vehicles")
            .WithTags("Vehicles")
            .RequireAuthorization("MechanicOnly");

        nested.MapGet("/", ListCustomerVehiclesAsync)
            .Produces<PagedResult<VehicleDetailDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        nested.MapPost("/", CreateVehicleAsync)
            .Produces<VehicleDetailDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        var flat = endpoints.MapGroup("/api/vehicles")
            .WithTags("Vehicles")
            .RequireAuthorization("MechanicOnly");

        flat.MapGet("/{id:int}", GetVehicleAsync)
            .Produces<VehicleDetailDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        flat.MapPut("/{id:int}", UpdateVehicleAsync)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        // Admin only, like appointment deletion: the cascade takes the vehicle's appointments and quotes with it.
        flat.MapDelete("/{id:int}", DeleteVehicleAsync)
            .RequireAuthorization("AdminOnly")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return endpoints;
    }
}
