/**
 * AppointmentEndpoints.Mutations.cs
 *
 * Auto-generated documentation header for this source file.
 */

using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AutoService.ApiService.Appointments;

/**
 * Backend type for API logic in this file.
 */
public static partial class AppointmentEndpoints
{
    /**
     * Creates an appointment for an existing customer/vehicle pair.
     * Endpoint: POST /api/customers/{customerId}/appointments (AdminOnly).
     *
     * @param customerId Target customer ID.
     * @param request Appointment creation payload.
     * @param db Database context.
     * @param loggerFactory Logger factory used to create endpoint logger.
     * @param cancellationToken Request cancellation token.
     * @return Created appointment DTO or validation/conflict result.
     */
    private static async Task<IResult> CreateForCustomerAsync(
        int customerId,
        CreateCustomerAppointmentRequest request,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.CreateForCustomer");

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
            logger.LogInformation("CreateForCustomer failed: customer {CustomerId} not found.", customerId);
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var vehicle = await db.Vehicles
            .Include(v => v.Customer)
            .FirstOrDefaultAsync(v => v.Id == request.VehicleId, cancellationToken);

        if (vehicle is null)
        {
            logger.LogInformation("CreateForCustomer failed: vehicle {VehicleId} not found.", request.VehicleId);
            return Results.Problem(
                detail: "Vehicle not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        if (vehicle.CustomerId != customerId)
        {
            logger.LogWarning("CreateForCustomer rejected: vehicle {VehicleId} does not belong to customer {CustomerId}.", request.VehicleId, customerId);
            return Results.Problem(
                detail: "Vehicle does not belong to the specified customer.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var mechanics = await db.Mechanics
            .Where(m => uniqueMechanicIds.Contains(m.Id))
            .ToListAsync(cancellationToken);

        if (mechanics.Count != uniqueMechanicIds.Length)
        {
            logger.LogWarning("CreateForCustomer rejected: one or more mechanic IDs are invalid.");
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

        logger.LogInformation("CreateForCustomer created appointment {AppointmentId} for customer {CustomerId}.", appointment.Id, customerId);

        return Results.Created($"/api/appointments/{appointment.Id}", ToDto(appointment));
    }

    /**
     * Assigns the current mechanic to an in-progress appointment.
     * Endpoint: PUT /api/appointments/{id}/claim.
     *
     * @param id Appointment ID.
     * @param user Authenticated user principal.
     * @param db Database context.
     * @param loggerFactory Logger factory used to create endpoint logger.
     * @param cancellationToken Request cancellation token.
     * @return Updated appointment DTO or conflict/validation result.
     */
    private static async Task<IResult> ClaimAsync(
        int id,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.Claim");

        var personIdClaim = user.FindFirst("person_id")?.Value;
        if (string.IsNullOrWhiteSpace(personIdClaim) || !int.TryParse(personIdClaim, out var mechanicId))
        {
            logger.LogWarning("Claim rejected: missing or invalid person_id claim.");
            return Results.Unauthorized();
        }

        var mechanic = await db.Mechanics.FindAsync([mechanicId], cancellationToken);
        if (mechanic is null)
        {
            logger.LogWarning("Claim rejected: mechanic {MechanicId} not found.", mechanicId);
            return Results.Unauthorized();
        }

        var appointment = await db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            logger.LogInformation("Claim failed: appointment {AppointmentId} not found.", id);
            return Results.NotFound(new { code = "appointment_not_found" });
        }

        if (appointment.Status == ProgresStatus.Cancelled)
        {
            return Results.UnprocessableEntity(new { code = "appointment_cancelled" });
        }

        if (appointment.Status != ProgresStatus.InProgress)
        {
            return Results.UnprocessableEntity(new { code = "appointment_not_in_progress" });
        }

        if (appointment.Mechanics.Any(m => m.Id == mechanicId))
        {
            logger.LogInformation("Claim conflict: mechanic {MechanicId} already assigned to appointment {AppointmentId}.", mechanicId, id);
            return Results.Conflict(new { code = "already_claimed" });
        }

        appointment.Mechanics.Add(mechanic);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            logger.LogInformation("Claim conflict from race condition on appointment {AppointmentId} for mechanic {MechanicId}.", id, mechanicId);
            return Results.Conflict(new { code = "already_claimed" });
        }

        logger.LogInformation("Claim succeeded: mechanic {MechanicId} assigned to appointment {AppointmentId}.", mechanicId, id);

        return Results.Ok(ToDto(appointment));
    }

    /**
     * Removes current mechanic assignment from an appointment.
     * Endpoint: DELETE /api/appointments/{id}/claim.
     *
     * @param id Appointment ID.
     * @param user Authenticated user principal.
     * @param db Database context.
     * @param loggerFactory Logger factory used to create endpoint logger.
     * @param cancellationToken Request cancellation token.
     * @return Updated appointment DTO or conflict/validation result.
     */
    private static async Task<IResult> UnclaimAsync(
        int id,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.Unclaim");

        var personIdClaim = user.FindFirst("person_id")?.Value;
        if (string.IsNullOrWhiteSpace(personIdClaim) || !int.TryParse(personIdClaim, out var mechanicId))
        {
            logger.LogWarning("Unclaim rejected: missing or invalid person_id claim.");
            return Results.Unauthorized();
        }

        var appointment = await db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            logger.LogInformation("Unclaim failed: appointment {AppointmentId} not found.", id);
            return Results.NotFound(new { code = "appointment_not_found" });
        }

        if (appointment.Status == ProgresStatus.Cancelled)
        {
            return Results.UnprocessableEntity(new { code = "appointment_cancelled" });
        }

        if (appointment.Status == ProgresStatus.Completed)
        {
            return Results.UnprocessableEntity(new { code = "appointment_completed" });
        }

        var mechanic = appointment.Mechanics.FirstOrDefault(m => m.Id == mechanicId);
        if (mechanic is null)
        {
            logger.LogInformation("Unclaim conflict: mechanic {MechanicId} is not assigned to appointment {AppointmentId}.", mechanicId, id);
            return Results.Conflict(new { code = "not_assigned" });
        }

        if (appointment.Mechanics.Count <= 1)
        {
            return Results.UnprocessableEntity(new { code = "last_assigned_mechanic" });
        }

        appointment.Mechanics.Remove(mechanic);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Unclaim succeeded: mechanic {MechanicId} removed from appointment {AppointmentId}.", mechanicId, id);

        return Results.Ok(ToDto(appointment));
    }

    /**
     * Assigns a mechanic to an appointment as admin.
     * Endpoint: PUT /api/appointments/{id}/assign/{mechanicId} (AdminOnly).
     *
     * @param id Appointment ID.
     * @param mechanicId Mechanic ID to assign.
     * @param db Database context.
     * @param loggerFactory Logger factory used to create endpoint logger.
     * @param cancellationToken Request cancellation token.
     * @return Updated appointment DTO or conflict/validation result.
     */
    private static async Task<IResult> AdminAssignAsync(
        int id,
        int mechanicId,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.AdminAssign");

        var mechanic = await db.Mechanics.FindAsync([mechanicId], cancellationToken);
        if (mechanic is null)
        {
            logger.LogInformation("AdminAssign failed: mechanic {MechanicId} not found.", mechanicId);
            return Results.NotFound(new { code = "mechanic_not_found" });
        }

        var appointment = await db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            logger.LogInformation("AdminAssign failed: appointment {AppointmentId} not found.", id);
            return Results.NotFound(new { code = "appointment_not_found" });
        }

        if (appointment.Status == ProgresStatus.Cancelled)
        {
            return Results.UnprocessableEntity(new { code = "appointment_cancelled" });
        }

        if (appointment.Status == ProgresStatus.Completed)
        {
            return Results.UnprocessableEntity(new { code = "appointment_completed" });
        }

        if (appointment.Mechanics.Any(m => m.Id == mechanicId))
        {
            logger.LogInformation("AdminAssign conflict: mechanic {MechanicId} already assigned to appointment {AppointmentId}.", mechanicId, id);
            return Results.Conflict(new { code = "already_assigned" });
        }

        appointment.Mechanics.Add(mechanic);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            logger.LogInformation("AdminAssign conflict from race condition on appointment {AppointmentId} for mechanic {MechanicId}.", id, mechanicId);
            return Results.Conflict(new { code = "already_assigned" });
        }

        logger.LogInformation("AdminAssign succeeded: mechanic {MechanicId} assigned to appointment {AppointmentId}.", mechanicId, id);

        return Results.Ok(ToDto(appointment));
    }

    /**
     * Removes a mechanic from an appointment as admin.
     * Endpoint: DELETE /api/appointments/{id}/assign/{mechanicId} (AdminOnly).
     *
     * @param id Appointment ID.
     * @param mechanicId Mechanic ID to unassign.
     * @param db Database context.
     * @param loggerFactory Logger factory used to create endpoint logger.
     * @param cancellationToken Request cancellation token.
     * @return Updated appointment DTO or conflict/validation result.
     */
    private static async Task<IResult> AdminUnassignAsync(
        int id,
        int mechanicId,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.AdminUnassign");

        var appointment = await db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            logger.LogInformation("AdminUnassign failed: appointment {AppointmentId} not found.", id);
            return Results.NotFound(new { code = "appointment_not_found" });
        }

        if (appointment.Status == ProgresStatus.Cancelled)
        {
            return Results.UnprocessableEntity(new { code = "appointment_cancelled" });
        }

        if (appointment.Status == ProgresStatus.Completed)
        {
            return Results.UnprocessableEntity(new { code = "appointment_completed" });
        }

        var mechanic = appointment.Mechanics.FirstOrDefault(m => m.Id == mechanicId);
        if (mechanic is null)
        {
            logger.LogInformation("AdminUnassign conflict: mechanic {MechanicId} is not assigned to appointment {AppointmentId}.", mechanicId, id);
            return Results.Conflict(new { code = "not_assigned" });
        }

        if (appointment.Mechanics.Count <= 1)
        {
            return Results.UnprocessableEntity(new { code = "last_assigned_mechanic" });
        }

        appointment.Mechanics.Remove(mechanic);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("AdminUnassign succeeded: mechanic {MechanicId} removed from appointment {AppointmentId}.", mechanicId, id);

        return Results.Ok(ToDto(appointment));
    }

    /**
     * Updates appointment status for an assigned mechanic.
     * Endpoint: PUT /api/appointments/{id}/status.
     *
     * @param id Appointment ID.
     * @param request Status update payload.
     * @param user Authenticated user principal.
     * @param db Database context.
     * @param loggerFactory Logger factory used to create endpoint logger.
     * @param cancellationToken Request cancellation token.
     * @return Updated appointment DTO or forbidden/validation result.
     */
    private static async Task<IResult> UpdateStatusAsync(
        int id,
        UpdateStatusRequest request,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.UpdateStatus");

        if (!Enum.TryParse<ProgresStatus>(request.Status, ignoreCase: true, out var newStatus))
        {
            logger.LogWarning("UpdateStatus rejected: invalid status value {Status}.", request.Status);
            return Results.BadRequest(new { code = "invalid_status", error = $"Valid statuses: {string.Join(", ", Enum.GetNames<ProgresStatus>())}" });
        }

        var personIdClaim = user.FindFirst("person_id")?.Value;
        if (string.IsNullOrWhiteSpace(personIdClaim) || !int.TryParse(personIdClaim, out var mechanicId))
        {
            logger.LogWarning("UpdateStatus rejected: missing or invalid person_id claim.");
            return Results.Unauthorized();
        }

        var appointment = await db.Appointments
            .Include(a => a.Mechanics)
            .Include(a => a.Vehicle).ThenInclude(v => v.Customer)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            logger.LogInformation("UpdateStatus failed: appointment {AppointmentId} not found.", id);
            return Results.NotFound(new { code = "appointment_not_found" });
        }

        if (!appointment.Mechanics.Any(m => m.Id == mechanicId))
        {
            logger.LogWarning("UpdateStatus forbidden for mechanic {MechanicId} on appointment {AppointmentId}.", mechanicId, id);
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

        logger.LogInformation("UpdateStatus succeeded for appointment {AppointmentId}; new status {Status}.", id, newStatus);

        return Results.Ok(ToDto(appointment));
    }
}