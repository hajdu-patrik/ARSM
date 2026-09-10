using Microsoft.AspNetCore.Routing;

namespace AutoService.ApiService.Catalog;

/**
 * Registers labor type catalog routes under /api/labor-types.
 * Handler logic is split into dedicated partial files.
 */
public static partial class LaborTypeEndpoints
{
    /**
     * Maps labor type endpoints to the route builder.
     *
     * @param endpoints Endpoint route builder.
     * @returns Route builder with labor type endpoints registered.
     */
    public static IEndpointRouteBuilder MapLaborTypeEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/labor-types").WithTags("LaborTypes").RequireAuthorization("MechanicOnly");

        group.MapGet("/", ListLaborTypesAsync)
            .Produces<List<LaborTypeDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        group.MapGet("/{id:int}", GetLaborTypeAsync)
            .Produces<LaborTypeDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/", CreateLaborTypeAsync)
            .Produces<LaborTypeDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapPut("/{id:int}", UpdateLaborTypeAsync)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapDelete("/{id:int}", DeleteLaborTypeAsync)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return endpoints;
    }
}
