using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /**
     * Returns all appointments for a given customer across all owned vehicles.
     *
     * @param customerId Target customer identifier.
     * @param descending Whether to sort by scheduled date in descending order.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @returns Appointment list or 404 if the customer does not exist.
     */
    private static async Task<IResult> GetByCustomerAsync(
        int customerId,
        bool descending,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var customerExists = await db.Customers
            .AnyAsync(c => c.Id == customerId, cancellationToken);

        if (!customerExists)
        {
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var appointmentsQuery = db.Appointments
            .AsNoTracking()
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .Include(a => a.Mechanics)
            .Where(a => a.Vehicle.CustomerId == customerId);

        var orderedAppointmentsQuery = descending
            ? appointmentsQuery.OrderByDescending(a => a.ScheduledDate).ThenByDescending(a => a.Id)
            : appointmentsQuery.OrderBy(a => a.ScheduledDate).ThenBy(a => a.Id);

        var appointments = await orderedAppointmentsQuery.ToListAsync(cancellationToken);

        return Results.Ok(appointments.Select(ToDto).ToList());
    }

    /**
     * Returns all appointments linked to a specific vehicle.
     *
     * @param vehicleId Target vehicle identifier.
     * @param descending Whether to sort by scheduled date in descending order.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @returns Appointment list or 404 if the vehicle does not exist.
     */
    private static async Task<IResult> GetByVehicleAsync(
        int vehicleId,
        bool descending,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var vehicleExists = await db.Vehicles
            .AnyAsync(v => v.Id == vehicleId, cancellationToken);

        if (!vehicleExists)
        {
            return Results.Problem(
                detail: "Vehicle not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var appointmentsQuery = db.Appointments
            .AsNoTracking()
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .Include(a => a.Mechanics)
            .Where(a => a.VehicleId == vehicleId);

        var orderedAppointmentsQuery = descending
            ? appointmentsQuery.OrderByDescending(a => a.ScheduledDate).ThenByDescending(a => a.Id)
            : appointmentsQuery.OrderBy(a => a.ScheduledDate).ThenBy(a => a.Id);

        var appointments = await orderedAppointmentsQuery.ToListAsync(cancellationToken);

        return Results.Ok(appointments.Select(ToDto).ToList());
    }

    /**
     * Returns appointments for the requested calendar month.
     *
     * Uses the current UTC year/month when parameters are not supplied.
     *
     * @param year Requested year in the accepted range.
     * @param month Requested month in the accepted range.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @returns Appointment list or 400 when the date range is invalid.
     */
    private static async Task<IResult> GetByMonthAsync(
        int? year,
        int? month,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var y = year ?? now.Year;
        var m = month ?? now.Month;

        if (y < 2000 || y > 2100 || m < 1 || m > 12)
        {
            return Results.BadRequest(new { code = "invalid_date_range", error = "Year must be 2000-2100, month must be 1-12." });
        }

        var rangeStart = new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Utc);
        var rangeEnd = rangeStart.AddMonths(1);

        var appointments = await db.Appointments
            .AsNoTracking()
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .Include(a => a.Mechanics)
            .Where(a => a.ScheduledDate >= rangeStart && a.ScheduledDate < rangeEnd)
            .OrderBy(a => a.ScheduledDate)
            .ToListAsync(cancellationToken);

        return Results.Ok(appointments.Select(ToDto).ToList());
    }

    /**
     * Returns appointments scheduled for the current UTC day.
     *
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @returns Appointment list for today.
     */
    private static async Task<IResult> GetTodayAsync(
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var todayStart = DateTime.UtcNow.Date;
        var todayEnd = todayStart.AddDays(1);

        var appointments = await db.Appointments
            .AsNoTracking()
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .Include(a => a.Mechanics)
            .Where(a => a.ScheduledDate >= todayStart && a.ScheduledDate < todayEnd)
            .OrderBy(a => a.ScheduledDate)
            .ToListAsync(cancellationToken);

        return Results.Ok(appointments.Select(ToDto).ToList());
    }
}