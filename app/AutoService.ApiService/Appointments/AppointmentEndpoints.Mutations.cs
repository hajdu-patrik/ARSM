using AutoService.ApiService.Appointments.Realtime;
using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;
using AutoService.ApiService.Identity;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** Assigns the current mechanic to an in-progress appointment. Endpoint: PUT /api/appointments/{id}/claim. */
    private static async Task<IResult> ClaimAsync(
        int id,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.Claim");

        if (!user.TryGetPersonId(out var mechanicId))
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

        return await AssignMechanicAsync(
            id, mechanic, "Claim", "already_claimed", requireInProgress: true, db, logger, broadcaster, cancellationToken);
    }

    /** Removes current mechanic assignment from an appointment. Endpoint: DELETE /api/appointments/{id}/claim. */
    private static async Task<IResult> UnclaimAsync(
        int id,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.Unclaim");

        if (!user.TryGetPersonId(out var mechanicId))
        {
            logger.LogWarning("Unclaim rejected: missing or invalid person_id claim.");
            return Results.Unauthorized();
        }

        return await UnassignMechanicAsync(id, mechanicId, "Unclaim", db, logger, broadcaster, cancellationToken);
    }

    /** Assigns a mechanic to an appointment as admin. Endpoint: PUT /api/appointments/{id}/assign/{mechanicId} (AdminOnly). */
    private static async Task<IResult> AdminAssignAsync(
        int id,
        int mechanicId,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.AdminAssign");

        var mechanic = await db.Mechanics.FindAsync([mechanicId], cancellationToken);
        if (mechanic is null)
        {
            logger.LogInformation("AdminAssign failed: mechanic {MechanicId} not found.", mechanicId);
            return Results.NotFound(new { code = "mechanic_not_found" });
        }

        return await AssignMechanicAsync(
            id, mechanic, "AdminAssign", "already_assigned", requireInProgress: false, db, logger, broadcaster, cancellationToken);
    }

    /** Removes a mechanic from an appointment as admin. Endpoint: DELETE /api/appointments/{id}/assign/{mechanicId} (AdminOnly). */
    private static Task<IResult> AdminUnassignAsync(
        int id,
        int mechanicId,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
        => UnassignMechanicAsync(
            id,
            mechanicId,
            "AdminUnassign",
            db,
            loggerFactory.CreateLogger("AppointmentEndpoints.AdminUnassign"),
            broadcaster,
            cancellationToken);

    /** Shared by claim and admin assign: open appointment, not yet assigned; a unique-violation race reads as the same 409. */
    private static async Task<IResult> AssignMechanicAsync(
        int id,
        Mechanic mechanic,
        string operation,
        string alreadyAssignedCode,
        bool requireInProgress,
        AutoServiceDbContext db,
        ILogger logger,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var appointment = await LoadAppointmentAsync(db, id, cancellationToken);
        if (appointment is null)
        {
            logger.LogInformation("{Operation} failed: appointment {AppointmentId} not found.", operation, id);
            return AppointmentNotFound();
        }

        var closedError = GetClosedAppointmentError(appointment);
        if (closedError is not null)
        {
            return closedError;
        }

        if (requireInProgress && appointment.Status != ProgressStatus.InProgress)
        {
            return Results.UnprocessableEntity(new { code = "appointment_not_in_progress" });
        }

        if (appointment.Mechanics.Any(m => m.Id == mechanic.Id))
        {
            logger.LogInformation(
                "{Operation} conflict: mechanic {MechanicId} already assigned to appointment {AppointmentId}.", operation, mechanic.Id, id);
            return Results.Conflict(new { code = alreadyAssignedCode });
        }

        appointment.Mechanics.Add(mechanic);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            logger.LogInformation(
                "{Operation} conflict from race condition on appointment {AppointmentId} for mechanic {MechanicId}.", operation, id, mechanic.Id);
            return Results.Conflict(new { code = alreadyAssignedCode });
        }

        logger.LogInformation(
            "{Operation} succeeded: mechanic {MechanicId} assigned to appointment {AppointmentId}.", operation, mechanic.Id, id);

        PublishAppointmentChanged(broadcaster, appointment.Id);

        return Results.Ok(ToDto(appointment));
    }

    /** Shared by unclaim and admin unassign: the row lock serializes concurrent removals, so the last mechanic always stays. */
    private static async Task<IResult> UnassignMechanicAsync(
        int id,
        int mechanicId,
        string operation,
        AutoServiceDbContext db,
        ILogger logger,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var (result, appointment) = await db.ExecuteInTransactionAsync(
            (transaction, token) => RemoveMechanicUnderLockAsync(id, mechanicId, operation, db, transaction, logger, token),
            cancellationToken);

        if (appointment is null)
        {
            return result;
        }

        logger.LogInformation(
            "{Operation} succeeded: mechanic {MechanicId} removed from appointment {AppointmentId}.", operation, mechanicId, id);

        PublishAppointmentChanged(broadcaster, appointment.Id);

        return Results.Ok(ToDto(appointment));
    }

    /** The retriable unit: lock the row, load, remove the mechanic, commit; an error result comes back without an appointment. */
    private static async Task<(IResult Result, Appointment? Appointment)> RemoveMechanicUnderLockAsync(
        int id,
        int mechanicId,
        string operation,
        AutoServiceDbContext db,
        IDbContextTransaction transaction,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM appointments WHERE \"Id\" = {id} FOR UPDATE", cancellationToken);

        var appointment = await LoadAppointmentAsync(db, id, cancellationToken);
        if (appointment is null)
        {
            logger.LogInformation("{Operation} failed: appointment {AppointmentId} not found.", operation, id);
            return (AppointmentNotFound(), null);
        }

        var closedError = GetClosedAppointmentError(appointment);
        if (closedError is not null)
        {
            return (closedError, null);
        }

        var mechanic = appointment.Mechanics.FirstOrDefault(m => m.Id == mechanicId);
        if (mechanic is null)
        {
            logger.LogInformation(
                "{Operation} conflict: mechanic {MechanicId} is not assigned to appointment {AppointmentId}.", operation, mechanicId, id);
            return (Results.Conflict(new { code = "not_assigned" }), null);
        }

        if (appointment.Mechanics.Count <= 1)
        {
            return (Results.UnprocessableEntity(new { code = "last_assigned_mechanic" }), null);
        }

        appointment.Mechanics.Remove(mechanic);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return (Results.Empty, appointment);
    }

    /** Cancelled and completed appointments take no assignment changes. */
    private static IResult? GetClosedAppointmentError(Appointment appointment) => appointment.Status switch
    {
        ProgressStatus.Cancelled => Results.UnprocessableEntity(new { code = "appointment_cancelled" }),
        ProgressStatus.Completed => Results.UnprocessableEntity(new { code = "appointment_completed" }),
        _ => null
    };
}
