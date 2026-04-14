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

        group.MapGet("/", ListCustomersAsync);
        group.MapGet("/by-email", GetCustomerByEmailAsync);
        group.MapGet("/{id:int}", GetCustomerAsync);
        group.MapPost("/", CreateCustomerAsync).RequireAuthorization("AdminOnly");
        group.MapPut("/{id:int}", UpdateCustomerAsync).RequireAuthorization("AdminOnly");
        group.MapDelete("/{id:int}", DeleteCustomerAsync).RequireAuthorization("AdminOnly");

        return endpoints;
    }
}
