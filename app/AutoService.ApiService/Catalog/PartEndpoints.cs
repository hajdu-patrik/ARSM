using Microsoft.AspNetCore.Routing;

namespace AutoService.ApiService.Catalog;

/**
 * Registers part catalog routes under /api/parts.
 * Handler logic is split into dedicated partial files.
 */
public static partial class PartEndpoints
{
    /**
     * Maps part endpoints to the route builder.
     *
     * @param endpoints Endpoint route builder.
     * @returns Route builder with part endpoints registered.
     */
    public static IEndpointRouteBuilder MapPartEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/parts").WithTags("Parts").RequireAuthorization("MechanicOnly");

        group.MapGet("/", ListPartsAsync)
            .Produces<List<PartDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        group.MapGet("/{id:int}", GetPartAsync)
            .Produces<PartDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/", CreatePartAsync)
            .Produces<PartDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapPut("/{id:int}", UpdatePartAsync)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapDelete("/{id:int}", DeletePartAsync)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return endpoints;
    }
}
