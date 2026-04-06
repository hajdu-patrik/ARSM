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
        group.MapPut("/{id}/status", UpdateStatusAsync);

        return endpoints;
    }
}