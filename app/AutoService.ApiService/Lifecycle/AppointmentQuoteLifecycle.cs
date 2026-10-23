using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.ApiService.Lifecycle;

/** One pure rule class so handlers, projections and docs cite a single source. */
internal static class AppointmentQuoteLifecycle
{
    public static bool HasAcceptedQuote(IEnumerable<Quote> quotes) =>
        quotes.Any(q => q.Status == QuoteStatus.Accepted);

    public static bool CanComplete(ProgressStatus status, bool hasAcceptedQuote) =>
        status == ProgressStatus.InProgress && hasAcceptedQuote;

    public static bool CanDelete(ProgressStatus status) =>
        status != ProgressStatus.Completed;

    public static bool CanLinkQuote(ProgressStatus status, bool hasAcceptedQuote) =>
        status == ProgressStatus.InProgress && !hasAcceptedQuote;

    /** Lock reason of a quote under its appointment, or null while the quote is editable. */
    public static string? ResolveQuoteLockReason(ProgressStatus? appointmentStatus, bool appointmentHasAcceptedQuote) =>
        appointmentStatus == ProgressStatus.Completed ? LifecycleErrorCodes.LockReasonAppointmentCompleted
        : appointmentStatus == ProgressStatus.Cancelled ? LifecycleErrorCodes.LockReasonAppointmentCancelled
        : appointmentStatus == ProgressStatus.InProgress && appointmentHasAcceptedQuote ? LifecycleErrorCodes.LockReasonAppointmentHasAcceptedQuote
        : null;

    /** Cancelled appointments free their quotes for deletion; Completed ones never do. */
    public static bool CanDeleteQuote(QuoteStatus status, ProgressStatus? appointmentStatus) =>
        appointmentStatus != ProgressStatus.Completed
        && (appointmentStatus == ProgressStatus.Cancelled || status == QuoteStatus.Draft);

    /** Maps a lock reason to its stable 409 error code. */
    public static string ToLockErrorCode(string lockReason) =>
        lockReason == LifecycleErrorCodes.LockReasonAppointmentCompleted ? LifecycleErrorCodes.QuoteLockedAppointmentCompleted
        : lockReason == LifecycleErrorCodes.LockReasonAppointmentCancelled ? LifecycleErrorCodes.QuoteLockedAppointmentCancelled
        : LifecycleErrorCodes.QuoteLockedAppointmentAccepted;
}
