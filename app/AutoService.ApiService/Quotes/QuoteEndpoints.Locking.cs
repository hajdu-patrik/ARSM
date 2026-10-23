using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Lifecycle;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /** Lock reason an appointment puts on its quotes; the Accepted sibling lookup only runs while InProgress. */
    private static async Task<string?> ResolveAppointmentLockReasonAsync(
        int appointmentId,
        ProgressStatus appointmentStatus,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var hasAcceptedQuote = appointmentStatus == ProgressStatus.InProgress
            && await db.Quotes.AnyAsync(
                s => s.AppointmentId == appointmentId && s.Status == QuoteStatus.Accepted, cancellationToken);

        return AppointmentQuoteLifecycle.ResolveQuoteLockReason(appointmentStatus, hasAcceptedQuote);
    }

    /** Lock reason of a loaded quote (needs q.Appointment included), or null when it is editable. */
    private static Task<string?> ResolveQuoteLockReasonAsync(
        Quote quote,
        AutoServiceDbContext db,
        CancellationToken cancellationToken) =>
        quote.Appointment is null
            ? Task.FromResult<string?>(null)
            : ResolveAppointmentLockReasonAsync(quote.Appointment.Id, quote.Appointment.Status, db, cancellationToken);

    /** The lock 409 for a loaded quote, or null when its mutations are allowed. */
    private static async Task<IResult?> CheckQuoteLockAsync(
        Quote quote,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var lockReason = await ResolveQuoteLockReasonAsync(quote, db, cancellationToken);
        return lockReason is null ? null : ConflictWithCode(AppointmentQuoteLifecycle.ToLockErrorCode(lockReason));
    }
}
