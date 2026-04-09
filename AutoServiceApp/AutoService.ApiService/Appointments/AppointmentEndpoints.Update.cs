using System.Security.Claims;
using AutoService.ApiService.Common;
using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    private static async Task<IResult> UpdateAppointmentAsync(
        int id,
        UpdateAppointmentRequest request,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (request.ScheduledDate == default)
        {
            return Results.Problem(
                detail: "ScheduledDate is required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.DueDateTime == default)
        {
            return Results.Problem(
                detail: "DueDateTime is required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var scheduledDateUtc = NormalizeToUtc(request.ScheduledDate);
        var dueDateTimeUtc = NormalizeToUtc(request.DueDateTime);

        if (dueDateTimeUtc < scheduledDateUtc)
        {
            return Results.Problem(
                detail: "DueDateTime must be greater than or equal to ScheduledDate.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var taskDescription = request.TaskDescription?.Trim();
        if (string.IsNullOrWhiteSpace(taskDescription))
        {
            return Results.Problem(
                detail: "TaskDescription is required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (taskDescription.Length > 200)
        {
            return Results.Problem(
                detail: "TaskDescription must be at most 200 characters.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (string.IsNullOrWhiteSpace(request.LicensePlate) ||
            string.IsNullOrWhiteSpace(request.Brand) ||
            string.IsNullOrWhiteSpace(request.Model))
        {
            return Results.Problem(
                detail: "LicensePlate, Brand, and Model are required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.Year is < 1886 or > 2100)
        {
            return Results.Problem(
                detail: "Year must be between 1886 and 2100.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.MileageKm < 0 || request.EnginePowerHp < 0 || request.EngineTorqueNm < 0)
        {
            return Results.Problem(
                detail: "MileageKm, EnginePowerHp, and EngineTorqueNm must be non-negative.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(request.LicensePlate, out var normalizedPlate, out var plateValidationError))
        {
            return Results.Problem(
                detail: plateValidationError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var personIdClaim = user.FindFirst("person_id")?.Value;
        if (string.IsNullOrWhiteSpace(personIdClaim) || !int.TryParse(personIdClaim, out var mechanicId))
        {
            return Results.Unauthorized();
        }

        var isAdmin = user.IsInRole("Admin");

        var appointment = await db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle)
                .ThenInclude(v => v.Customer)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return Results.NotFound(new { code = "appointment_not_found" });
        }

        if (!isAdmin && !appointment.Mechanics.Any(m => m.Id == mechanicId))
        {
            return Results.Forbid();
        }

        var nowUtc = DateTime.UtcNow;

        if (appointment.ScheduledDate < nowUtc && scheduledDateUtc != appointment.ScheduledDate)
        {
            return Results.Problem(
                detail: "ScheduledDate cannot be changed for past appointments.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var plateConflict = await db.Vehicles
            .AnyAsync(v => v.LicensePlate == normalizedPlate && v.Id != appointment.VehicleId, cancellationToken);

        if (plateConflict)
        {
            return Results.Problem(
                detail: "A vehicle with this license plate already exists.",
                statusCode: StatusCodes.Status409Conflict);
        }

        if (appointment.ScheduledDate >= nowUtc)
        {
            appointment.ScheduledDate = scheduledDateUtc;
        }
        appointment.DueDateTime = dueDateTimeUtc;
        appointment.TaskDescription = taskDescription;

        appointment.Vehicle.LicensePlate = normalizedPlate;
        appointment.Vehicle.Brand = request.Brand.Trim();
        appointment.Vehicle.Model = request.Model.Trim();
        appointment.Vehicle.Year = request.Year;
        appointment.Vehicle.MileageKm = request.MileageKm;
        appointment.Vehicle.EnginePowerHp = request.EnginePowerHp;
        appointment.Vehicle.EngineTorqueNm = request.EngineTorqueNm;

        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(ToDto(appointment));
    }
}
