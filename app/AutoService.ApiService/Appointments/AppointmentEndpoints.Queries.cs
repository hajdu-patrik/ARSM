using System.Linq.Expressions;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Pagination;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** Server-side projection mirroring {@code ToDto}, so EF Core fetches only mapped columns; name/enum
        formatting runs through static helpers EF Core evaluates client-side, to keep exact domain formatting. */
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

    /** Returns the appointments of a given customer across all owned vehicles, capped at the shared list limit. */
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

    /** Returns the appointments linked to a specific vehicle, capped at the shared list limit. */
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

    /** Returns appointments for the requested calendar month. Uses the current UTC year/month when parameters are not supplied. */
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

    /** Returns appointments scheduled for the current UTC day. */
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

    /** Applies the deterministic history ordering: scheduled date, then id as tie-breaker. */
    private static IOrderedQueryable<Appointment> OrderHistory(IQueryable<Appointment> query, bool? descending)
        => descending == true
            ? query.OrderByDescending(a => a.ScheduledDate).ThenByDescending(a => a.Id)
            : query.OrderBy(a => a.ScheduledDate).ThenBy(a => a.Id);

    /** Formats owned name parts exactly like {@code FullName.ToString()}; EF Core evaluates it client-side. */
    private static string FormatFullName(string firstName, string? middleName, string lastName)
        => new FullName(firstName, middleName, lastName).ToString();

    /** Returns the enum member name exactly like {@code Enum.ToString()}; EF Core evaluates it client-side. */
    private static string FormatEnumName<TEnum>(TEnum value)
        where TEnum : struct, Enum
        => value.ToString();
}