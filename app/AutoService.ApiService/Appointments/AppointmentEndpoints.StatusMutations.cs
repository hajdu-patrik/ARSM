using System.Security.Claims;
using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Http;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Lifecycle;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    private static async Task<IResult> UpdateStatusAsync(
        int id,
        UpdateStatusRequest request,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.UpdateStatus");

        if (!Enum.TryParse<ProgressStatus>(request.Status, ignoreCase: true, out var newStatus))
        {
            logger.LogWarning("UpdateStatus rejected: invalid status value {Status}.", request.Status);
            return Results.BadRequest(new { code = "invalid_status", error = $"Valid statuses: {string.Join(", ", Enum.GetNames<ProgressStatus>())}" });
        }

        if (!user.TryGetPersonId(out var mechanicId))
        {
            logger.LogWarning("UpdateStatus rejected: missing or invalid person_id claim.");
            return Results.Unauthorized();
        }

        var missingVersionError = OptimisticConcurrency.GetMissingVersionError(request.Version);
        if (missingVersionError is not null)
        {
            return missingVersionError;
        }

        var appointment = await LoadAppointmentAsync(db, id, cancellationToken);

        if (appointment is null)
        {
            logger.LogInformation("UpdateStatus failed: appointment {AppointmentId} not found.", id);
            return AppointmentNotFound();
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

        var transitionError = GetStatusTransitionError(appointment, newStatus, logger);
        if (transitionError is not null)
        {
            return transitionError;
        }

        ApplyStatus(appointment, newStatus);

        var saveError = await SaveAppointmentWithVersionAsync(db, appointment, request.Version, cancellationToken);
        if (saveError is not null)
        {
            return saveError;
        }

        logger.LogInformation("UpdateStatus succeeded for appointment {AppointmentId}; new status {Status}.", id, newStatus);

        PublishAppointmentChanged(broadcaster, appointment.Id);

        return Results.Ok(ToDto(appointment));
    }

    /** Returns the 409 for a blocked transition (Completed is terminal; completing needs InProgress and an accepted quote), else null. */
    private static IResult? GetStatusTransitionError(Appointment appointment, ProgressStatus newStatus, ILogger logger)
    {
        if (appointment.Status == ProgressStatus.Completed)
        {
            logger.LogInformation("UpdateStatus rejected: appointment {AppointmentId} is completed.", appointment.Id);
            return Results.Conflict(new ErrorCodeResponse(LifecycleErrorCodes.AppointmentCompletedTerminal));
        }

        if (newStatus == ProgressStatus.Completed && appointment.Status != ProgressStatus.InProgress)
        {
            logger.LogInformation("UpdateStatus rejected: appointment {AppointmentId} is not in progress.", appointment.Id);
            return Results.Conflict(new ErrorCodeResponse(LifecycleErrorCodes.AppointmentCompletionRequiresInProgress));
        }

        if (newStatus == ProgressStatus.Completed && !AppointmentQuoteLifecycle.HasAcceptedQuote(appointment.Quotes))
        {
            logger.LogInformation("UpdateStatus rejected: appointment {AppointmentId} has no accepted quote.", appointment.Id);
            return Results.Conflict(new ErrorCodeResponse(LifecycleErrorCodes.AppointmentCompletionRequiresAcceptedQuote));
        }

        return null;
    }

    /** Sets the status and stamps or clears CompletedAt and CanceledAt to match. */
    private static void ApplyStatus(Appointment appointment, ProgressStatus newStatus)
    {
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
    }
}