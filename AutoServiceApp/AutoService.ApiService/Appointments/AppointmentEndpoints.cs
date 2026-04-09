namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    public static IEndpointRouteBuilder MapAppointmentEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/appointments")
                             .WithTags("Appointments")
                             .RequireAuthorization();

        group.MapGet(string.Empty, GetByMonthAsync);
        group.MapGet("/today", GetTodayAsync);
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