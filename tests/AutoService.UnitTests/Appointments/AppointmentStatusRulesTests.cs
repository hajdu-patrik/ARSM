using System.Security.Claims;
using AutoService.ApiService.Appointments;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Lifecycle;
using AutoService.UnitTests.Http;
using AutoService.UnitTests.Quotes;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoService.UnitTests.Appointments;

/** Appointment status moves, their stamps, the closed-appointment guard and the checks before any lookup. */
public sealed class AppointmentStatusRulesTests
{
    private static Appointment WithQuotes(ProgressStatus status, params QuoteStatus[] quoteStatuses)
    {
        var appointment = QuoteFixtures.NewAppointment(status);
        foreach (var quoteStatus in quoteStatuses)
        {
            appointment.Quotes.Add(new Quote("T", null, QuoteFixtures.Now, 1, null, null) { Status = quoteStatus });
        }

        return appointment;
    }

    private static IResult? TransitionError(Appointment appointment, ProgressStatus target) => PrivateStatic.Call<IResult?>(
        typeof(AppointmentEndpoints), "GetStatusTransitionError", appointment, target, NullLogger.Instance);

    private static ClaimsPrincipal Caller(params Claim[] claims) => new(new ClaimsIdentity(claims, "test"));

    private static async Task<IResult> UpdateStatus(string status, uint version, ClaimsPrincipal user)
    {
        object?[] args = [1, new AppointmentEndpoints.UpdateStatusRequest(status, version), user, null, NullLoggerFactory.Instance, null, CancellationToken.None];
        return await (Task<IResult>)PrivateStatic.Run(typeof(AppointmentEndpoints), "UpdateStatusAsync", args)!;
    }

    [Theory]
    [InlineData(ProgressStatus.InProgress)]
    [InlineData(ProgressStatus.Cancelled)]
    public void A_completed_appointment_is_terminal_for_every_other_status(ProgressStatus target)
    {
        var result = TransitionError(WithQuotes(ProgressStatus.Completed, QuoteStatus.Accepted), target);

        Assert.Equal(409, ResultAssert.StatusOf(result));
        Assert.Equal(LifecycleErrorCodes.AppointmentCompletedTerminal, ResultAssert.CodeOf(result));
    }

    [Fact]
    public void Completing_a_cancelled_appointment_needs_it_reopened_first()
    {
        var result = TransitionError(WithQuotes(ProgressStatus.Cancelled, QuoteStatus.Accepted), ProgressStatus.Completed);

        Assert.Equal(409, ResultAssert.StatusOf(result));
        Assert.Equal(LifecycleErrorCodes.AppointmentCompletionRequiresInProgress, ResultAssert.CodeOf(result));
    }

    [Fact]
    public void Completing_needs_an_accepted_quote()
    {
        QuoteStatus[][] withoutAccepted = [[], [QuoteStatus.Draft], [QuoteStatus.Sent], [QuoteStatus.Rejected, QuoteStatus.Draft]];

        foreach (var quotes in withoutAccepted)
        {
            var result = TransitionError(WithQuotes(ProgressStatus.InProgress, quotes), ProgressStatus.Completed);

            Assert.Equal(409, ResultAssert.StatusOf(result));
            Assert.Equal(LifecycleErrorCodes.AppointmentCompletionRequiresAcceptedQuote, ResultAssert.CodeOf(result));
        }
    }

    [Fact]
    public void Completing_with_an_accepted_quote_among_others_is_allowed()
    {
        Assert.Null(TransitionError(WithQuotes(ProgressStatus.InProgress, QuoteStatus.Draft, QuoteStatus.Accepted), ProgressStatus.Completed));
    }

    [Theory]
    [InlineData(ProgressStatus.InProgress, ProgressStatus.Cancelled)]
    [InlineData(ProgressStatus.Cancelled, ProgressStatus.InProgress)]
    public void Cancelling_and_reopening_need_no_quote(ProgressStatus start, ProgressStatus end)
    {
        Assert.Null(TransitionError(WithQuotes(start), end));
    }

    [Fact]
    public void ApplyStatus_completed_stamps_CompletedAt_and_clears_CanceledAt()
    {
        var appointment = QuoteFixtures.NewAppointment(ProgressStatus.InProgress);
        appointment.CanceledAt = QuoteFixtures.Now;
        var before = DateTime.UtcNow;

        PrivateStatic.Run(typeof(AppointmentEndpoints), "ApplyStatus", [appointment, ProgressStatus.Completed]);

        Assert.Equal(ProgressStatus.Completed, appointment.Status);
        Assert.InRange(appointment.CompletedAt!.Value, before, DateTime.UtcNow);
        Assert.Null(appointment.CanceledAt);
    }

    [Fact]
    public void ApplyStatus_cancelled_stamps_CanceledAt_and_clears_CompletedAt()
    {
        var appointment = QuoteFixtures.NewAppointment(ProgressStatus.InProgress);
        appointment.CompletedAt = QuoteFixtures.Now;
        var before = DateTime.UtcNow;

        PrivateStatic.Run(typeof(AppointmentEndpoints), "ApplyStatus", [appointment, ProgressStatus.Cancelled]);

        Assert.Equal(ProgressStatus.Cancelled, appointment.Status);
        Assert.InRange(appointment.CanceledAt!.Value, before, DateTime.UtcNow);
        Assert.Null(appointment.CompletedAt);
    }

    [Fact]
    public void ApplyStatus_in_progress_clears_both_stamps()
    {
        var appointment = QuoteFixtures.NewAppointment(ProgressStatus.Cancelled);
        appointment.CanceledAt = QuoteFixtures.Now;
        appointment.CompletedAt = QuoteFixtures.Now;

        PrivateStatic.Run(typeof(AppointmentEndpoints), "ApplyStatus", [appointment, ProgressStatus.InProgress]);

        Assert.Equal(ProgressStatus.InProgress, appointment.Status);
        Assert.Null(appointment.CompletedAt);
        Assert.Null(appointment.CanceledAt);
    }

    [Theory]
    [InlineData(ProgressStatus.Cancelled, "appointment_cancelled")]
    [InlineData(ProgressStatus.Completed, "appointment_completed")]
    [InlineData(ProgressStatus.InProgress, null)]
    public void GetClosedAppointmentError_blocks_assignment_changes_on_closed_appointments(ProgressStatus status, string? code)
    {
        var result = PrivateStatic.Call<IResult?>(typeof(AppointmentEndpoints), "GetClosedAppointmentError", QuoteFixtures.NewAppointment(status));

        Assert.Equal(code, ResultAssert.CodeOf(result));
        Assert.Equal(code is null ? (int?)null : 422, ResultAssert.StatusOf(result));
    }

    [Fact]
    public void AppointmentNotFound_is_404_with_the_stable_code()
    {
        var result = PrivateStatic.Call<IResult>(typeof(AppointmentEndpoints), "AppointmentNotFound");

        Assert.Equal(404, ResultAssert.StatusOf(result));
        Assert.Equal("appointment_not_found", ResultAssert.CodeOf(result));
    }

    [Fact]
    public async Task UpdateStatus_with_an_unknown_name_is_a_400_with_the_valid_names()
    {
        var result = await UpdateStatus("Archived", 1, Caller(new Claim("person_id", "5")));

        Assert.Equal(400, ResultAssert.StatusOf(result));
        Assert.Equal("invalid_status", ResultAssert.CodeOf(result));
    }

    [Fact]
    public async Task UpdateStatus_with_a_numeric_status_is_a_400_like_an_unknown_name()
    {
        // Enum.TryParse takes "7" as an undefined ProgressStatus, so the request is not rejected as invalid.
        var result = await UpdateStatus("7", 1, Caller());

        Assert.Equal(400, ResultAssert.StatusOf(result));
        Assert.Equal("invalid_status", ResultAssert.CodeOf(result));
    }

    [Fact]
    public async Task UpdateStatus_without_a_person_claim_is_401()
    {
        var result = await UpdateStatus("Cancelled", 1, Caller());

        Assert.Equal(401, ResultAssert.StatusOf(result));
    }

    [Fact]
    public async Task UpdateStatus_without_a_version_is_422_before_any_lookup()
    {
        var result = await UpdateStatus("Cancelled", 0, Caller(new Claim("person_id", "5")));

        ResultAssert.Problem(result, 422, "Version is required.");
    }
}
