namespace AutoService.ApiService.Quotes;

/**
 * Registers quote routes under /api/quotes and the nested
 * /api/vehicles/{vehicleId}/quotes creation/listing routes.
 * Handler logic is split into dedicated partial files.
 */
public static partial class QuoteEndpoints
{
    /**
     * Maps quote endpoints to the route builder.
     *
     * @param endpoints Endpoint route builder.
     * @returns Route builder with quote endpoints registered.
     */
    public static IEndpointRouteBuilder MapQuoteEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/quotes")
            .WithTags("Quotes")
            .RequireAuthorization("MechanicOnly");

        group.MapGet(string.Empty, ListQuotesAsync)
            .Produces<List<QuoteListItemDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapGet("/{id:int}", GetQuoteAsync)
            .Produces<QuoteDetailDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPut("/{id:int}", UpdateQuoteAsync)
            .Produces<QuoteDetailDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .Produces<ErrorCodeResponse>(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapDelete("/{id:int}", DeleteQuoteAsync)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .Produces<ErrorCodeResponse>(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapPost("/{id:int}/lines", AddQuoteLineAsync)
            .Produces<QuoteDetailDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .Produces<ErrorCodeResponse>(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapPut("/{id:int}/lines/{lineId:int}", UpdateQuoteLineAsync)
            .Produces<QuoteDetailDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .Produces<ErrorCodeResponse>(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapDelete("/{id:int}/lines/{lineId:int}", DeleteQuoteLineAsync)
            .Produces<QuoteDetailDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .Produces<ErrorCodeResponse>(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapPost("/{id:int}/status", ChangeQuoteStatusAsync)
            .Produces<QuoteDetailDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .Produces<ErrorCodeResponse>(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapPut("/{id:int}/valid-until", ExtendQuoteValidityAsync)
            .Produces<QuoteDetailDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .Produces<ErrorCodeResponse>(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        var vehicleQuotes = endpoints.MapGroup("/api/vehicles/{vehicleId:int}/quotes")
            .WithTags("Quotes")
            .RequireAuthorization("MechanicOnly");

        vehicleQuotes.MapGet(string.Empty, GetByVehicleAsync)
            .Produces<List<QuoteListItemDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        vehicleQuotes.MapPost(string.Empty, CreateQuoteAsync)
            .Produces<QuoteDetailDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        return endpoints;
    }
}
