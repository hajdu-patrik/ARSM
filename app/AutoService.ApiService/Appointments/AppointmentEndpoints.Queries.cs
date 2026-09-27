using System.Linq.Expressions;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Pagination;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /**
     * Server-side projection of an appointment into its list DTO.
     *
     * Mirrors {@code ToDto} field for field so list and mutation responses serialize identically,
     * but lets EF Core fetch only the mapped columns instead of whole Vehicle/Customer/Mechanic rows.
     * Name and enum formatting run through static helpers that EF Core evaluates on the client in the
     * top-level projection, which keeps the exact domain formatting.
     */
    private static readonly Expression<Func<Appointment, AppointmentDto>> AppointmentDtoProjection = a => new AppointmentDto(
        a.Id,
        a.ScheduledDate,
        a.IntakeCreatedAt,
        a.DueDateTime,
        a.TaskDescription,
        FormatEnumName(a.Status),
        a.CompletedAt,
        a.CanceledAt,
        new VehicleDto(
            a.Vehicle.Id,
            a.Vehicle.LicensePlate,
            a.Vehicle.Vin,
            a.Vehicle.Brand,
            a.Vehicle.Model,
            a.Vehicle.Year,
            a.Vehicle.MileageKm,
            a.Vehicle.EnginePowerKw,
            FormatEnumName(a.Vehicle.DrivetrainType),
            a.Vehicle.CustomerId),
        a.Mechanics
            .Select(m => new MechanicSummaryDto(
                m.Id,
                FormatFullName(m.Name.FirstName, m.Name.MiddleName, m.Name.LastName),
                FormatEnumName(m.Specialization),
                m.ProfilePictureObjectKey != null || m.ProfilePictureContentType != null))
            .ToList());

    /**
     * Returns the appointments of a given customer across all owned vehicles, capped at the shared list limit.
     *
     * @param customerId Target customer identifier.
     * @param descending Whether to sort by scheduled date in descending order; omitted means ascending.
     * @param limit Optional maximum row count, normalized by {@code ListQueryLimits.Normalize}.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @returns Appointment list or 404 if the customer does not exist.
     */
    private static async Task<IResult> GetByCustomerAsync(
        int customerId,
        bool? descending,
        int? limit,
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
            .Where(a => a.Vehicle.CustomerId == customerId);

        var appointments = await OrderHistory(appointmentsQuery, descending)
            .Take(ListQueryLimits.Normalize(limit))
            .Select(AppointmentDtoProjection)
            .ToListAsync(cancellationToken);

        return Results.Ok(appointments);
    }

    /**
     * Returns the appointments linked to a specific vehicle, capped at the shared list limit.
     *
     * @param vehicleId Target vehicle identifier.
     * @param descending Whether to sort by scheduled date in descending order; omitted means ascending.
     * @param limit Optional maximum row count, normalized by {@code ListQueryLimits.Normalize}.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @returns Appointment list or 404 if the vehicle does not exist.
     */
    private static async Task<IResult> GetByVehicleAsync(
        int vehicleId,
        bool? descending,
        int? limit,
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
            .Where(a => a.VehicleId == vehicleId);

        var appointments = await OrderHistory(appointmentsQuery, descending)
            .Take(ListQueryLimits.Normalize(limit))
            .Select(AppointmentDtoProjection)
            .ToListAsync(cancellationToken);

        return Results.Ok(appointments);
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
            .Where(a => a.ScheduledDate >= rangeStart && a.ScheduledDate < rangeEnd)
            .OrderBy(a => a.ScheduledDate)
            .Select(AppointmentDtoProjection)
            .ToListAsync(cancellationToken);

        return Results.Ok(appointments);
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
            .Where(a => a.ScheduledDate >= todayStart && a.ScheduledDate < todayEnd)
            .OrderBy(a => a.ScheduledDate)
            .Select(AppointmentDtoProjection)
            .ToListAsync(cancellationToken);

        return Results.Ok(appointments);
    }

    /**
     * Applies the deterministic history ordering: scheduled date, then id as tie-breaker.
     *
     * @param query Filtered appointment query.
     * @param descending Whether to sort newest first; omitted means ascending.
     * @returns The ordered query.
     */
    private static IOrderedQueryable<Appointment> OrderHistory(IQueryable<Appointment> query, bool? descending)
        => descending == true
            ? query.OrderByDescending(a => a.ScheduledDate).ThenByDescending(a => a.Id)
            : query.OrderBy(a => a.ScheduledDate).ThenBy(a => a.Id);

    /**
     * Formats owned name parts exactly like {@code FullName.ToString()}; EF Core evaluates it client-side.
     *
     * @param firstName First name column value.
     * @param middleName Optional middle name column value.
     * @param lastName Last name column value.
     * @returns The readable full name.
     */
    private static string FormatFullName(string firstName, string? middleName, string lastName)
        => new FullName(firstName, middleName, lastName).ToString();

    /**
     * Returns the enum member name exactly like {@code Enum.ToString()}; EF Core evaluates it client-side.
     *
     * @param value Materialized enum value.
     * @returns The enum member name.
     */
    private static string FormatEnumName<TEnum>(TEnum value)
        where TEnum : struct, Enum
        => value.ToString();
}