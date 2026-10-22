using AutoService.ApiService.Data;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.DataInitialization;

public static partial class DatabaseInitializer
{
    private static async Task EnsureNoAppointmentsWithoutMechanicsAsync(AutoServiceDbContext db, CancellationToken cancellationToken)
    {
        var orphanedAppointmentIds = await db.Appointments
            .Where(appointment => !appointment.Mechanics.Any())
            .OrderBy(appointment => appointment.Id)
            .Select(appointment => appointment.Id)
            .ToListAsync(cancellationToken);

        if (orphanedAppointmentIds.Count == 0)
        {
            return;
        }

        throw new InvalidOperationException(
            $"Data integrity violation: appointments without assigned mechanics detected. AppointmentIds: {string.Join(", ", orphanedAppointmentIds)}");
    }

    /** Status timestamps only: phone uniqueness is enforced by the IX_people_PhoneNumber index since its migration. */
    private static async Task NormalizePersistedDataAsync(AutoServiceDbContext db, CancellationToken cancellationToken)
    {
        var appointments = await db.Appointments
            .Where(a =>
                (a.Status == ProgressStatus.Completed && (a.CompletedAt == null || a.CanceledAt != null)) ||
                (a.Status == ProgressStatus.Cancelled && (a.CanceledAt == null || a.CompletedAt != null)) ||
                (a.Status == ProgressStatus.InProgress && (a.CompletedAt != null || a.CanceledAt != null)))
            .ToListAsync(cancellationToken);

        if (appointments.Count == 0)
        {
            return;
        }

        foreach (var appointment in appointments)
        {
            switch (appointment.Status)
            {
                case ProgressStatus.Completed:
                    appointment.CompletedAt ??= appointment.DueDateTime >= appointment.ScheduledDate
                        ? appointment.DueDateTime
                        : appointment.ScheduledDate;
                    appointment.CanceledAt = null;
                    break;
                case ProgressStatus.Cancelled:
                    appointment.CanceledAt ??= appointment.ScheduledDate;
                    appointment.CompletedAt = null;
                    break;
                case ProgressStatus.InProgress:
                    appointment.CompletedAt = null;
                    appointment.CanceledAt = null;
                    break;
                default:
                    break;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    /** Clears rows the 2026-04 BackfillDemoData migration inserts into every fresh database
     * (no owner = not real data); runs before the mechanic-less-appointment integrity check, only when no mechanic/Identity account exists. */
    private static async Task ResetLegacyBackfillDatasetWhenUnownedAsync(AutoServiceDbContext db, CancellationToken cancellationToken)
    {
        if (await db.Mechanics.AnyAsync(cancellationToken) || await db.Users.AnyAsync(cancellationToken))
        {
            return;
        }

        var hasBackfillRows = await db.Customers.AnyAsync(cancellationToken)
            || await db.Vehicles.AnyAsync(cancellationToken)
            || await db.Appointments.AnyAsync(cancellationToken);

        if (hasBackfillRows)
        {
            await ResetLegacyBackfillDatasetAsync(db, cancellationToken);
        }
    }

    private static async Task ResetLegacyBackfillDatasetAsync(AutoServiceDbContext db, CancellationToken cancellationToken)
    {
        // Use explicit set-based deletes to avoid raw TRUNCATE execution.
        await db.UserTokens.ExecuteDeleteAsync(cancellationToken);
        await db.UserRoles.ExecuteDeleteAsync(cancellationToken);
        await db.UserLogins.ExecuteDeleteAsync(cancellationToken);
        await db.UserClaims.ExecuteDeleteAsync(cancellationToken);
        await db.RoleClaims.ExecuteDeleteAsync(cancellationToken);

        await db.RefreshTokens.ExecuteDeleteAsync(cancellationToken);
        await db.RevokedJwtTokens.ExecuteDeleteAsync(cancellationToken);
        await db.Appointments.ExecuteDeleteAsync(cancellationToken);
        await db.Vehicles.ExecuteDeleteAsync(cancellationToken);
        await db.People.ExecuteDeleteAsync(cancellationToken);

        await db.Users.ExecuteDeleteAsync(cancellationToken);
        await db.Roles.ExecuteDeleteAsync(cancellationToken);
    }
}