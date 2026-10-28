using AutoService.ApiService.Http;
using AutoService.ApiService.Pagination;
using AutoService.ApiService.Security;

namespace AutoService.ApiService.Quotes;

/** Registers quote routes under /api/quotes and the nested /api/vehicles/{vehicleId}/quotes routes; handler logic split into partial files. */
public static partial class QuoteEndpoints
{
    public static IEndpointRouteBuilder MapQuoteEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/quotes")
            .WithTags("Quotes")
            .RequireAuthorization("MechanicOnly");

        group.MapGet(string.Empty, ListQuotesAsync)
            .Produces<PagedResult<QuoteListItemDto>>(StatusCodes.Status200OK)
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
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity)
            .Produces(StatusCodes.Status429TooManyRequests);

        group.MapGet("/{id:int}/pdf", GetQuotePdfAsync)
            .RequireRateLimiting(RateLimitPolicies.QuotePdfRenders)
            .Produces(StatusCodes.Status200OK, contentType: "application/pdf")
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status429TooManyRequests);

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
            .Produces<ErrorCodeResponse>(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        return endpoints;
    }
}
