/**
 * CustomerEndpoints.cs
 *
 * Auto-generated documentation header for this source file.
 */

using Microsoft.AspNetCore.Routing;

namespace AutoService.ApiService.Customers;

/**
 * Registers customer routes under /api/customers.
 * Handler logic is split into dedicated partial files.
 */
public static partial class CustomerEndpoints
{
        /**
         * MapCustomerEndpoints operation.
         *
         * @param endpoints Parameter.
         * @returns Return value.
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

            group.MapGet("/{id:int}", GetCustomerAsync)
                .Produces<CustomerWithVehiclesDto>(StatusCodes.Status200OK)
                .Produces(StatusCodes.Status401Unauthorized)
                .ProducesProblem(StatusCodes.Status404NotFound);

            group.MapPost("/", CreateCustomerAsync)
                .RequireAuthorization("AdminOnly")
                .Produces<CustomerDto>(StatusCodes.Status201Created)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces(StatusCodes.Status403Forbidden)
                .ProducesProblem(StatusCodes.Status409Conflict)
                .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

            group.MapPut("/{id:int}", UpdateCustomerAsync)
                .RequireAuthorization("AdminOnly")
                .Produces(StatusCodes.Status204NoContent)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces(StatusCodes.Status403Forbidden)
                .ProducesProblem(StatusCodes.Status404NotFound)
                .ProducesProblem(StatusCodes.Status409Conflict)
                .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

            group.MapDelete("/{id:int}", DeleteCustomerAsync)
                .RequireAuthorization("AdminOnly")
                .Produces(StatusCodes.Status204NoContent)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces(StatusCodes.Status403Forbidden)
                .ProducesProblem(StatusCodes.Status404NotFound);

        return endpoints;
    }
}
