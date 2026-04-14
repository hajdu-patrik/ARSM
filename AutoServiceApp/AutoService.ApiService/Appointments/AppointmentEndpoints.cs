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

        group.MapGet(string.Empty, GetByMonthAsync);
        group.MapGet("/today", GetTodayAsync);
        group.MapPost("/intake", CreateIntakeAsync);
        group.MapPut("/{id}", UpdateAppointmentAsync);
        group.MapPut("/{id}/claim", ClaimAsync);
        group.MapDelete("/{id}/claim", UnclaimAsync);
        group.MapPut("/{id}/status", UpdateStatusAsync);
        group.MapPut("/{id}/assign/{mechanicId}", AdminAssignAsync).RequireAuthorization("AdminOnly");
        group.MapDelete("/{id}/assign/{mechanicId}", AdminUnassignAsync).RequireAuthorization("AdminOnly");

        var customerAppointments = endpoints.MapGroup("/api/customers/{customerId:int}/appointments")
            .WithTags("Appointments")
            .RequireAuthorization("AdminOnly");

        customerAppointments.MapPost(string.Empty, CreateForCustomerAsync);

        return endpoints;
    }
}