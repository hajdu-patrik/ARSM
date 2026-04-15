/**
 * AppointmentEndpoints.cs
 *
 * Auto-generated documentation header for this source file.
 */

namespace AutoService.ApiService.Appointments;

/**
 * Backend type for API logic in this file.
 */
public static partial class AppointmentEndpoints
{
        /**
         * MapAppointmentEndpoints operation.
         *
         * @param endpoints Parameter.
         * @returns Return value.
         */
        public static IEndpointRouteBuilder MapAppointmentEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/appointments")
                             .WithTags("Appointments")
                             .RequireAuthorization();

            group.MapGet(string.Empty, GetByMonthAsync)
                .Produces<List<AppointmentDto>>(StatusCodes.Status200OK)
                .Produces<object>(StatusCodes.Status400BadRequest)
                .Produces(StatusCodes.Status401Unauthorized);

            group.MapGet("/today", GetTodayAsync)
                .Produces<List<AppointmentDto>>(StatusCodes.Status200OK)
                .Produces(StatusCodes.Status401Unauthorized);

            group.MapPost("/intake", CreateIntakeAsync)
                .Produces<AppointmentDto>(StatusCodes.Status201Created)
                .Produces(StatusCodes.Status401Unauthorized)
                .ProducesProblem(StatusCodes.Status404NotFound)
                .ProducesProblem(StatusCodes.Status409Conflict)
                .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

            group.MapPut("/{id}", UpdateAppointmentAsync)
                .Produces<AppointmentDto>(StatusCodes.Status200OK)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces(StatusCodes.Status403Forbidden)
                .Produces<object>(StatusCodes.Status404NotFound)
                .ProducesProblem(StatusCodes.Status409Conflict)
                .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

            group.MapPut("/{id}/claim", ClaimAsync)
                .Produces<AppointmentDto>(StatusCodes.Status200OK)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces<object>(StatusCodes.Status404NotFound)
                .Produces<object>(StatusCodes.Status409Conflict)
                .Produces<object>(StatusCodes.Status422UnprocessableEntity);

            group.MapDelete("/{id}/claim", UnclaimAsync)
                .Produces<AppointmentDto>(StatusCodes.Status200OK)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces<object>(StatusCodes.Status404NotFound)
                .Produces<object>(StatusCodes.Status409Conflict)
                .Produces<object>(StatusCodes.Status422UnprocessableEntity);

            group.MapPut("/{id}/status", UpdateStatusAsync)
                .Produces<AppointmentDto>(StatusCodes.Status200OK)
                .Produces<object>(StatusCodes.Status400BadRequest)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces(StatusCodes.Status403Forbidden)
                .Produces<object>(StatusCodes.Status404NotFound);

            group.MapPut("/{id}/assign/{mechanicId}", AdminAssignAsync)
                .RequireAuthorization("AdminOnly")
                .Produces<AppointmentDto>(StatusCodes.Status200OK)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces(StatusCodes.Status403Forbidden)
                .Produces<object>(StatusCodes.Status404NotFound)
                .Produces<object>(StatusCodes.Status409Conflict)
                .Produces<object>(StatusCodes.Status422UnprocessableEntity);

            group.MapDelete("/{id}/assign/{mechanicId}", AdminUnassignAsync)
                .RequireAuthorization("AdminOnly")
                .Produces<AppointmentDto>(StatusCodes.Status200OK)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces(StatusCodes.Status403Forbidden)
                .Produces<object>(StatusCodes.Status404NotFound)
                .Produces<object>(StatusCodes.Status409Conflict)
                .Produces<object>(StatusCodes.Status422UnprocessableEntity);

        var customerAppointments = endpoints.MapGroup("/api/customers/{customerId:int}/appointments")
            .WithTags("Appointments")
            .RequireAuthorization("AdminOnly");

        customerAppointments.MapPost(string.Empty, CreateForCustomerAsync)
            .Produces<AppointmentDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        return endpoints;
    }
}