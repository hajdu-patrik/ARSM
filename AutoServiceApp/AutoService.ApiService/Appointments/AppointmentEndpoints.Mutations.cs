using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using AutoService.ApiService.Models.UniqueTypes;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    private static async Task<IResult> CreateForCustomerAsync(
        int customerId,
        CreateCustomerAppointmentRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (request.VehicleId <= 0)
        {
            return Results.Problem(
                detail: "VehicleId must be a positive integer.",
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

        if (request.MechanicIds is null || request.MechanicIds.Count == 0)
        {
            return Results.Problem(
                detail: "At least one mechanic must be assigned.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.MechanicIds.Any(id => id <= 0))
        {
            return Results.Problem(
                detail: "MechanicIds must contain positive values only.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var uniqueMechanicIds = request.MechanicIds.Distinct().ToArray();
        if (uniqueMechanicIds.Length != request.MechanicIds.Count)
        {
            return Results.Problem(
                detail: "MechanicIds must be unique.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.ScheduledDate == default)
        {
            return Results.Problem(
                detail: "ScheduledDate is required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var customerExists = await db.Customers
            .AnyAsync(c => c.Id == customerId, cancellationToken);

        if (!customerExists)
        {
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var vehicle = await db.Vehicles
            .Include(v => v.Customer)
            .FirstOrDefaultAsync(v => v.Id == request.VehicleId, cancellationToken);

        if (vehicle is null)
        {
            return Results.Problem(
                detail: "Vehicle not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        if (vehicle.CustomerId != customerId)
        {
            return Results.Problem(
                detail: "Vehicle does not belong to the specified customer.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var mechanics = await db.Mechanics
            .Where(m => uniqueMechanicIds.Contains(m.Id))
            .ToListAsync(cancellationToken);

        if (mechanics.Count != uniqueMechanicIds.Length)
        {
            return Results.Problem(
                detail: "One or more mechanicIds are invalid.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var scheduledDateUtc = request.ScheduledDate.Kind switch
        {
            DateTimeKind.Utc => request.ScheduledDate,
            DateTimeKind.Local => request.ScheduledDate.ToUniversalTime(),
            _ => DateTime.SpecifyKind(request.ScheduledDate, DateTimeKind.Utc)
        };

        var appointment = new Appointment
        {
            ScheduledDate = scheduledDateUtc,
            IntakeCreatedAt = DateTime.UtcNow,
            DueDateTime = scheduledDateUtc,
            TaskDescription = taskDescription,
            Status = ProgresStatus.InProgress,
            VehicleId = vehicle.Id,
            Vehicle = vehicle,
            Mechanics = mechanics
        };

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created($"/api/appointments/{appointment.Id}", ToDto(appointment));
    }

    private static async Task<IResult> ClaimAsync(
        int id,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var personIdClaim = user.FindFirst("person_id")?.Value;
        if (string.IsNullOrWhiteSpace(personIdClaim) || !int.TryParse(personIdClaim, out var mechanicId))
        {
            return Results.Unauthorized();
        }

        var mechanic = await db.Mechanics.FindAsync([mechanicId], cancellationToken);
        if (mechanic is null)
        {
            return Results.Unauthorized();
        }

        var appointment = await db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return Results.NotFound(new { code = "appointment_not_found" });
        }

        if (appointment.Status == ProgresStatus.Cancelled)
        {
            return Results.UnprocessableEntity(new { code = "appointment_cancelled" });
        }

        if (appointment.Mechanics.Any(m => m.Id == mechanicId))
        {
            return Results.Conflict(new { code = "already_claimed" });
        }

        appointment.Mechanics.Add(mechanic);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return Results.Conflict(new { code = "already_claimed" });
        }

        return Results.Ok(ToDto(appointment));
    }

    private static async Task<IResult> UnclaimAsync(
        int id,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var personIdClaim = user.FindFirst("person_id")?.Value;
        if (string.IsNullOrWhiteSpace(personIdClaim) || !int.TryParse(personIdClaim, out var mechanicId))
        {
            return Results.Unauthorized();
        }

        var appointment = await db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return Results.NotFound(new { code = "appointment_not_found" });
        }

        if (appointment.Status == ProgresStatus.Cancelled)
        {
            return Results.UnprocessableEntity(new { code = "appointment_cancelled" });
        }

        var mechanic = appointment.Mechanics.FirstOrDefault(m => m.Id == mechanicId);
        if (mechanic is null)
        {
            return Results.Conflict(new { code = "not_assigned" });
        }

        if (appointment.Mechanics.Count <= 1)
        {
            return Results.UnprocessableEntity(new { code = "last_assigned_mechanic" });
        }

        appointment.Mechanics.Remove(mechanic);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(ToDto(appointment));
    }

    private static async Task<IResult> AdminAssignAsync(
        int id,
        int mechanicId,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var mechanic = await db.Mechanics.FindAsync([mechanicId], cancellationToken);
        if (mechanic is null)
        {
            return Results.NotFound(new { code = "mechanic_not_found" });
        }

        var appointment = await db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return Results.NotFound(new { code = "appointment_not_found" });
        }

        if (appointment.Status == ProgresStatus.Cancelled)
        {
            return Results.UnprocessableEntity(new { error = "Cannot modify mechanics on a cancelled appointment. Change the status first." });
        }

        if (appointment.Mechanics.Any(m => m.Id == mechanicId))
        {
            return Results.Conflict(new { code = "already_assigned" });
        }

        appointment.Mechanics.Add(mechanic);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return Results.Conflict(new { code = "already_assigned" });
        }

        return Results.Ok(ToDto(appointment));
    }

    private static async Task<IResult> AdminUnassignAsync(
        int id,
        int mechanicId,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var appointment = await db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return Results.NotFound(new { code = "appointment_not_found" });
        }

        if (appointment.Status == ProgresStatus.Cancelled)
        {
            return Results.UnprocessableEntity(new { error = "Cannot modify mechanics on a cancelled appointment. Change the status first." });
        }

        var mechanic = appointment.Mechanics.FirstOrDefault(m => m.Id == mechanicId);
        if (mechanic is null)
        {
            return Results.Conflict(new { code = "not_assigned" });
        }

        if (appointment.Mechanics.Count <= 1)
        {
            return Results.UnprocessableEntity(new { code = "last_assigned_mechanic" });
        }

        appointment.Mechanics.Remove(mechanic);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(ToDto(appointment));
    }

    private static async Task<IResult> UpdateStatusAsync(
        int id,
        UpdateStatusRequest request,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<ProgresStatus>(request.Status, ignoreCase: true, out var newStatus))
        {
            return Results.BadRequest(new { code = "invalid_status", error = $"Valid statuses: {string.Join(", ", Enum.GetNames<ProgresStatus>())}" });
        }

        var personIdClaim = user.FindFirst("person_id")?.Value;
        if (string.IsNullOrWhiteSpace(personIdClaim) || !int.TryParse(personIdClaim, out var mechanicId))
        {
            return Results.Unauthorized();
        }

        var appointment = await db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return Results.NotFound(new { code = "appointment_not_found" });
        }

        if (!appointment.Mechanics.Any(m => m.Id == mechanicId))
        {
            return Results.Forbid();
        }

        appointment.Status = newStatus;

        if (newStatus == ProgresStatus.Completed)
        {
            appointment.CompletedAt = DateTime.UtcNow;
            appointment.CanceledAt = null;
        }
        else if (newStatus == ProgresStatus.Cancelled)
        {
            appointment.CanceledAt = DateTime.UtcNow;
            appointment.CompletedAt = null;
        }
        else if (newStatus == ProgresStatus.InProgress)
        {
            appointment.CompletedAt = null;
            appointment.CanceledAt = null;
        }

        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(ToDto(appointment));
    }
}