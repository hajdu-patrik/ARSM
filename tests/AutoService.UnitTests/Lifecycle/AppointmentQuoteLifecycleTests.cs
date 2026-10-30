using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Lifecycle;

namespace AutoService.UnitTests.Lifecycle;

/** Every transition rule of the appointment-quote lifecycle and the stable code each lock maps to. */
public sealed class AppointmentQuoteLifecycleTests
{
    private static Quote QuoteWith(QuoteStatus status) =>
        new("Title", null, new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc), 1, null, null) { Status = status };

    [Fact]
    public void HasAcceptedQuote_needs_at_least_one_accepted_quote()
    {
        Assert.False(AppointmentQuoteLifecycle.HasAcceptedQuote([]));
        Assert.False(AppointmentQuoteLifecycle.HasAcceptedQuote(
            [QuoteWith(QuoteStatus.Draft), QuoteWith(QuoteStatus.Sent), QuoteWith(QuoteStatus.Rejected)]));
        Assert.True(AppointmentQuoteLifecycle.HasAcceptedQuote(
            [QuoteWith(QuoteStatus.Draft), QuoteWith(QuoteStatus.Accepted)]));
    }

    [Theory]
    [InlineData(ProgressStatus.InProgress, true, true)]
    [InlineData(ProgressStatus.InProgress, false, false)]
    [InlineData(ProgressStatus.Completed, true, false)]
    [InlineData(ProgressStatus.Completed, false, false)]
    [InlineData(ProgressStatus.Cancelled, true, false)]
    [InlineData(ProgressStatus.Cancelled, false, false)]
    public void CanComplete_needs_an_in_progress_appointment_with_an_accepted_quote(ProgressStatus status, bool hasAccepted, bool expected)
    {
        Assert.Equal(expected, AppointmentQuoteLifecycle.CanComplete(status, hasAccepted));
    }

    [Theory]
    [InlineData(ProgressStatus.InProgress, true)]
    [InlineData(ProgressStatus.Cancelled, true)]
    [InlineData(ProgressStatus.Completed, false)]
    public void CanDelete_refuses_only_a_completed_appointment(ProgressStatus status, bool expected)
    {
        Assert.Equal(expected, AppointmentQuoteLifecycle.CanDelete(status));
    }

    [Theory]
    [InlineData(ProgressStatus.InProgress, false, true)]
    [InlineData(ProgressStatus.InProgress, true, false)]
    [InlineData(ProgressStatus.Completed, false, false)]
    [InlineData(ProgressStatus.Cancelled, false, false)]
    [InlineData(ProgressStatus.Cancelled, true, false)]
    public void CanLinkQuote_needs_an_open_appointment_without_an_accepted_quote(ProgressStatus status, bool hasAccepted, bool expected)
    {
        Assert.Equal(expected, AppointmentQuoteLifecycle.CanLinkQuote(status, hasAccepted));
    }

    [Theory]
    [InlineData(ProgressStatus.Completed, false, "appointment_completed")]
    [InlineData(ProgressStatus.Completed, true, "appointment_completed")]
    [InlineData(ProgressStatus.Cancelled, false, "appointment_cancelled")]
    [InlineData(ProgressStatus.Cancelled, true, "appointment_cancelled")]
    [InlineData(ProgressStatus.InProgress, true, "appointment_has_accepted_quote")]
    [InlineData(ProgressStatus.InProgress, false, null)]
    public void ResolveQuoteLockReason_names_why_an_appointment_locks_its_quotes(ProgressStatus status, bool hasAccepted, string? expected)
    {
        Assert.Equal(expected, AppointmentQuoteLifecycle.ResolveQuoteLockReason(status, hasAccepted));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ResolveQuoteLockReason_never_locks_a_quote_without_an_appointment(bool hasAccepted)
    {
        Assert.Null(AppointmentQuoteLifecycle.ResolveQuoteLockReason(null, hasAccepted));
    }

    [Theory]
    [InlineData(QuoteStatus.Draft, null, true)]
    [InlineData(QuoteStatus.Sent, null, false)]
    [InlineData(QuoteStatus.Accepted, null, false)]
    [InlineData(QuoteStatus.Rejected, null, false)]
    [InlineData(QuoteStatus.Draft, ProgressStatus.InProgress, true)]
    [InlineData(QuoteStatus.Sent, ProgressStatus.InProgress, false)]
    [InlineData(QuoteStatus.Accepted, ProgressStatus.InProgress, false)]
    [InlineData(QuoteStatus.Draft, ProgressStatus.Cancelled, true)]
    [InlineData(QuoteStatus.Sent, ProgressStatus.Cancelled, true)]
    [InlineData(QuoteStatus.Accepted, ProgressStatus.Cancelled, true)]
    [InlineData(QuoteStatus.Rejected, ProgressStatus.Cancelled, true)]
    [InlineData(QuoteStatus.Draft, ProgressStatus.Completed, false)]
    [InlineData(QuoteStatus.Sent, ProgressStatus.Completed, false)]
    [InlineData(QuoteStatus.Accepted, ProgressStatus.Completed, false)]
    public void CanDeleteQuote_frees_drafts_and_every_quote_of_a_cancelled_appointment_but_never_a_completed_one(
        QuoteStatus status, ProgressStatus? appointmentStatus, bool expected)
    {
        Assert.Equal(expected, AppointmentQuoteLifecycle.CanDeleteQuote(status, appointmentStatus));
    }

    [Theory]
    [InlineData("appointment_completed", "quote_locked_appointment_completed")]
    [InlineData("appointment_cancelled", "quote_locked_appointment_cancelled")]
    [InlineData("appointment_has_accepted_quote", "quote_locked_appointment_accepted")]
    public void ToLockErrorCode_maps_each_lock_reason_to_its_409_code(string reason, string expectedCode)
    {
        Assert.Equal(expectedCode, AppointmentQuoteLifecycle.ToLockErrorCode(reason));
    }

    [Fact]
    public void The_error_codes_are_the_stable_strings_the_webui_and_the_http_suites_assert()
    {
        Assert.Equal("appointment_completion_requires_accepted_quote", LifecycleErrorCodes.AppointmentCompletionRequiresAcceptedQuote);
        Assert.Equal("appointment_completion_requires_in_progress", LifecycleErrorCodes.AppointmentCompletionRequiresInProgress);
        Assert.Equal("appointment_completed_terminal", LifecycleErrorCodes.AppointmentCompletedTerminal);
        Assert.Equal("quote_locked_appointment_completed", LifecycleErrorCodes.QuoteLockedAppointmentCompleted);
        Assert.Equal("quote_locked_appointment_cancelled", LifecycleErrorCodes.QuoteLockedAppointmentCancelled);
        Assert.Equal("quote_locked_appointment_accepted", LifecycleErrorCodes.QuoteLockedAppointmentAccepted);
        Assert.Equal("appointment_completed", LifecycleErrorCodes.LockReasonAppointmentCompleted);
        Assert.Equal("appointment_cancelled", LifecycleErrorCodes.LockReasonAppointmentCancelled);
        Assert.Equal("appointment_has_accepted_quote", LifecycleErrorCodes.LockReasonAppointmentHasAcceptedQuote);
    }
}
