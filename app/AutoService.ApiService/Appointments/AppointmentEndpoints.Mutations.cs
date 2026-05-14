using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
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

        if (appointment.Status == ProgressStatus.Cancelled)
        {
            return Results.UnprocessableEntity(new { code = "appointment_cancelled" });
        }

        if (appointment.Status == ProgressStatus.Completed)
        {
            return Results.UnprocessableEntity(new { code = "appointment_completed" });
        }

        if (appointment.Status != ProgressStatus.InProgress)
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

        if (appointment.Status == ProgressStatus.Cancelled)
        {
            return Results.UnprocessableEntity(new { code = "appointment_cancelled" });
        }

        if (appointment.Status == ProgressStatus.Completed)
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

        if (appointment.Status == ProgressStatus.Cancelled)
        {
            return Results.UnprocessableEntity(new { code = "appointment_cancelled" });
        }

        if (appointment.Status == ProgressStatus.Completed)
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

        if (appointment.Status == ProgressStatus.Cancelled)
        {
            return Results.UnprocessableEntity(new { code = "appointment_cancelled" });
        }

        if (appointment.Status == ProgressStatus.Completed)
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
}