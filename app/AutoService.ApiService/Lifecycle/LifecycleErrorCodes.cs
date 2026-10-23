namespace AutoService.ApiService.Lifecycle;

/** Stable 409 codes and quote lock reasons of the appointment-quote lifecycle. */
internal static class LifecycleErrorCodes
{
    public const string AppointmentCompletionRequiresAcceptedQuote = "appointment_completion_requires_accepted_quote";
    public const string AppointmentCompletionRequiresInProgress = "appointment_completion_requires_in_progress";
    public const string AppointmentCompletedTerminal = "appointment_completed_terminal";
    public const string QuoteLockedAppointmentCompleted = "quote_locked_appointment_completed";
    public const string QuoteLockedAppointmentCancelled = "quote_locked_appointment_cancelled";
    public const string QuoteLockedAppointmentAccepted = "quote_locked_appointment_accepted";

    public const string LockReasonAppointmentCompleted = "appointment_completed";
    public const string LockReasonAppointmentCancelled = "appointment_cancelled";
    public const string LockReasonAppointmentHasAcceptedQuote = "appointment_has_accepted_quote";
}
