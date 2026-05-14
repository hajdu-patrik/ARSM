using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
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

        if (!Enum.TryParse<ProgressStatus>(request.Status, ignoreCase: true, out var newStatus))
        {
            logger.LogWarning("UpdateStatus rejected: invalid status value {Status}.", request.Status);
            return Results.BadRequest(new { code = "invalid_status", error = $"Valid statuses: {string.Join(", ", Enum.GetNames<ProgressStatus>())}" });
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

        if (appointment.Status == newStatus)
        {
            logger.LogInformation("UpdateStatus no-op for appointment {AppointmentId}; status already {Status}.", id, newStatus);
            return Results.Ok(ToDto(appointment));
        }

        appointment.Status = newStatus;

        if (newStatus == ProgressStatus.Completed)
        {
            appointment.CompletedAt = DateTime.UtcNow;
            appointment.CanceledAt = null;
        }
        else if (newStatus == ProgressStatus.Cancelled)
        {
            appointment.CanceledAt = DateTime.UtcNow;
            appointment.CompletedAt = null;
        }
        else if (newStatus == ProgressStatus.InProgress)
        {
            appointment.CompletedAt = null;
            appointment.CanceledAt = null;
        }

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("UpdateStatus succeeded for appointment {AppointmentId}; new status {Status}.", id, newStatus);

        return Results.Ok(ToDto(appointment));
    }
}