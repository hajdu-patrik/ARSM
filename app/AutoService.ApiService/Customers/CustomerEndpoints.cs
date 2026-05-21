using Microsoft.AspNetCore.Routing;

namespace AutoService.ApiService.Customers;

/**
 * Registers customer routes under /api/customers.
 * Handler logic is split into dedicated partial files.
 */
public static partial class CustomerEndpoints
{
    /**
     * Maps customer endpoints to the route builder.
     *
     * @param endpoints Endpoint route builder.
     * @returns Route builder with customer endpoints registered.
     */
    public static IEndpointRouteBuilder MapCustomerEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/customers").WithTags("Customers").RequireAuthorization();

        group.MapGet("/", ListCustomersAsync)
            .Produces<List<CustomerDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/by-email", GetCustomerByEmailAsync)
            .Produces<SchedulerCustomerLookupDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapGet("/by-license-plate", GetCustomerByLicensePlateAsync)
            .Produces<SchedulerCustomerLookupDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapGet("/by-name", GetCustomersByNameAsync)
            .Produces<List<SchedulerCustomerLookupDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapGet("/{id:int}", GetCustomerAsync)
            .Produces<CustomerWithVehiclesDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/", CreateCustomerAsync)
            .Produces<CustomerDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapPut("/{id:int}", UpdateCustomerAsync)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapDelete("/{id:int}", DeleteCustomerAsync)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return endpoints;
    }
}
