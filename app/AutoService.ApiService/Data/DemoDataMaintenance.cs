using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.DataInitialization;

public static partial class DemoDataInitializer
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

    private static async Task NormalizePersistedDataAsync(AutoServiceDbContext db, CancellationToken cancellationToken)
    {
        await NormalizeAppointmentStatusTimestampsAsync(db, cancellationToken);
        await NormalizeDuplicatePhoneNumbersAsync(db, cancellationToken);
    }

    private static async Task NormalizeAppointmentStatusTimestampsAsync(AutoServiceDbContext db, CancellationToken cancellationToken)
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

    private static async Task NormalizeDuplicatePhoneNumbersAsync(AutoServiceDbContext db, CancellationToken cancellationToken)
    {
        var peopleWithPhone = await db.People
            .Where(person => person.PhoneNumber != null)
            .ToListAsync(cancellationToken);

        if (peopleWithPhone.Count == 0)
        {
            return;
        }

        var seenPhones = new HashSet<string>(StringComparer.Ordinal);
        var hasChanges = false;

        foreach (var person in peopleWithPhone
                     .OrderBy(person => person is Mechanic ? 0 : 1)
                     .ThenBy(person => person.Id))
        {
            var phone = person.PhoneNumber;
            if (phone is null)
            {
                continue;
            }

            if (!seenPhones.Add(phone))
            {
                person.PhoneNumber = null;
                hasChanges = true;
            }
        }

        if (!hasChanges)
        {
            return;
        }

        await db.SaveChangesAsync(cancellationToken);
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