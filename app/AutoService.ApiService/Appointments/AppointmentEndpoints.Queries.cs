using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
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