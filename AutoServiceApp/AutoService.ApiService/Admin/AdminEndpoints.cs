/**
 * AdminEndpoints.cs
 *
 * Auto-generated documentation header for this source file.
 */

using Microsoft.AspNetCore.Routing;

namespace AutoService.ApiService.Admin;

/**
 * Registers admin routes under the /api/admin group.
 * Handler logic is split into dedicated partial files.
 */
public static partial class AdminEndpoints
{
        /**
         * MapAdminEndpoints operation.
         *
         * @param endpoints Parameter.
         * @returns Return value.
         */
        public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/admin").WithTags("Admin").RequireAuthorization("AdminOnly");

        group.MapGet("/mechanics", ListMechanicsAsync);
        group.MapDelete("/mechanics/{id:int}", DeleteMechanicAsync);

        return endpoints;
    }
}
