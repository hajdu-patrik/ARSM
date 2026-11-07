using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Email;
using AutoService.ApiService.Email.Sending;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;
using AutoService.ApiService.Security;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /** The quote status state machine (D7): Draft->Sent; Sent->Accepted or Rejected; Accepted/Rejected
     * are terminal (CLAUDE.md Quote Anchors). */
    private static bool IsAllowedQuoteStatusTransition(QuoteStatus from, QuoteStatus to) => (from, to) switch
    {
        (QuoteStatus.Draft, QuoteStatus.Sent) => true,
        (QuoteStatus.Sent, QuoteStatus.Accepted) => true,
        (QuoteStatus.Sent, QuoteStatus.Rejected) => true,
        _ => false
    };

    /** The answer of one status change plus the appointment id of a quote that just became Accepted (to publish). */
    private readonly record struct StatusChangeOutcome(IResult Result, int? AcceptedAppointmentId);

    /** Transitions a quote to a new status; Draft->Sent requires at least one line (D21), and
     * SentAt/DecidedAt are stamped the same way Appointment stamps CompletedAt/CanceledAt. */
    private static async Task<IResult> ChangeQuoteStatusAsync(
        int id,
        ChangeQuoteStatusRequest request,
        AutoServiceDbContext db,
        IEmailSender emailSender,
        EmailSettings emailSettings,
        ILoggerFactory loggerFactory,
        IAppointmentUpdateBroadcaster broadcaster,
        HttpContext httpContext,
        QuoteSendRateLimiter sendRateLimiter,
        CancellationToken cancellationToken)
    {
        if (!DefinedEnum.TryParse<QuoteStatus>(request.Status, out var newStatus))
        {
            return ApiProblem.Unprocessable($"Status must be one of: {string.Join(", ", Enum.GetNames<QuoteStatus>())}.");
        }

        var mailer = new QuoteSentMailer(emailSender, emailSettings, loggerFactory.CreateLogger<QuoteSentMailer>());
        Task<StatusChangeOutcome> RunChange(CancellationToken token) =>
            ApplyStatusChangeAsync(id, request, newStatus, mailer, db, httpContext, sendRateLimiter, token);

        var outcome = newStatus == QuoteStatus.Accepted
            ? await ChangeToAcceptedAsync(id, db, RunChange, cancellationToken)
            : await RunChange(cancellationToken);

        // Published after the commit, so other schedulers see the new hasAcceptedQuote / canComplete state.
        if (outcome.AcceptedAppointmentId is int appointmentId)
        {
            broadcaster.PublishAppointmentChanged(appointmentId);
        }

        return outcome.Result;
    }

    /** Serializes Accept per appointment: the appointment row lock makes the loser of two parallel Accepts on
     * sibling quotes re-run the lock check after the winner committed, so it answers the sequential 409. */
    private static async Task<StatusChangeOutcome> ChangeToAcceptedAsync(
        int id,
        AutoServiceDbContext db,
        Func<CancellationToken, Task<StatusChangeOutcome>> change,
        CancellationToken cancellationToken)
    {
        var appointmentId = await db.Quotes.AsNoTracking()
            .Where(q => q.Id == id)
            .Select(q => q.AppointmentId)
            .FirstOrDefaultAsync(cancellationToken);

        if (appointmentId is null)
        {
            return await change(cancellationToken);
        }

        return await db.ExecuteInTransactionAsync(
            async (transaction, token) =>
            {
                await db.Database.ExecuteSqlInterpolatedAsync(
                    $"SELECT 1 FROM appointments WHERE \"Id\" = {appointmentId} FOR UPDATE", token);

                var outcome = await change(token);
                if (outcome.AcceptedAppointmentId is not null)
                {
                    await transaction.CommitAsync(token);
                }

                return outcome;
            },
            cancellationToken);
    }

    /** The checks, the mail for Sent and the save; the outcome names the appointment of a quote that became Accepted. */
    private static async Task<StatusChangeOutcome> ApplyStatusChangeAsync(
        int id,
        ChangeQuoteStatusRequest request,
        QuoteStatus newStatus,
        QuoteSentMailer mailer,
        AutoServiceDbContext db,
        HttpContext httpContext,
        QuoteSendRateLimiter sendRateLimiter,
        CancellationToken cancellationToken)
    {
        var (quote, loadError) = await LoadUnlockedQuoteAsync(id, db, cancellationToken);
        if (loadError is not null)
        {
            return new StatusChangeOutcome(loadError, null);
        }

        if (!IsAllowedQuoteStatusTransition(quote!.Status, newStatus))
        {
            return new StatusChangeOutcome(ApiProblem.Conflict($"Cannot transition a quote from {quote.Status} to {newStatus}."), null);
        }

        var missingVersionError = OptimisticConcurrency.GetMissingVersionError(request.Version);
        if (missingVersionError is not null)
        {
            return new StatusChangeOutcome(missingVersionError, null);
        }

        if (newStatus == QuoteStatus.Sent)
        {
            var sendError = await SendQuoteAsync(quote, request.Version, mailer, db, httpContext, sendRateLimiter, cancellationToken);
            if (sendError is not null)
            {
                return new StatusChangeOutcome(sendError, null);
            }
        }

        ApplyQuoteStatusTransition(quote, newStatus);

        var saveError = await SaveWithVersionAsync(db, quote, request.Version, cancellationToken);
        if (saveError is not null)
        {
            return new StatusChangeOutcome(saveError, null);
        }

        // Re-resolved after the save: an Accepted quote locks the whole appointment.
        var lockReason = await ResolveQuoteLockReasonAsync(quote, db, cancellationToken);
        return new StatusChangeOutcome(
            Results.Ok(ToQuoteDetailDto(quote, DateTime.UtcNow, lockReason)),
            newStatus == QuoteStatus.Accepted ? quote.AppointmentId : null);
    }

    /** Draft->Sent: the preconditions in contract order, then the permit, render and mail (user decision 2026-10-23:
     * the mail goes out before the save, so Sent is only stored after the mail service accepted it). Returns the error result or null. */
    private static async Task<IResult?> SendQuoteAsync(
        Quote quote,
        uint version,
        QuoteSentMailer mailer,
        AutoServiceDbContext db,
        HttpContext httpContext,
        QuoteSendRateLimiter sendRateLimiter,
        CancellationToken cancellationToken)
    {
        var preconditionError = GetSendPreconditionError(quote, version, DateTime.UtcNow);
        if (preconditionError is not null)
        {
            return preconditionError;
        }

        // Only a send that is about to render and mail takes the hourly permit; a refusal is a bodiless 429.
        using var lease = sendRateLimiter.Acquire(httpContext);
        if (!lease.IsAcquired)
        {
            return Results.StatusCode(StatusCodes.Status429TooManyRequests);
        }

        var company = await db.CompanyProfiles.AsNoTracking().FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("Company profile row is missing.");
        var profile = company.ToProfile();
        var pdf = await RenderQuotePdfAsync(quote, profile, db, cancellationToken);
        var result = await mailer.SendAsync(quote, profile, pdf, cancellationToken);

        return result.Sent ? null : ConflictWithCode("quote_email_failed");
    }

    /** The Sent checks after the transition and version checks: no lines 409, valid-until passed 422,
     * stale version 409, no deliverable customer address 422. */
    private static IResult? GetSendPreconditionError(Quote quote, uint version, DateTime nowUtc)
    {
        if (quote.Lines.Count == 0)
        {
            return ApiProblem.Conflict("A quote must have at least one line before it can be sent.");
        }

        if (quote.ValidUntil < nowUtc)
        {
            return UnprocessableWithCode("quote_valid_until_passed");
        }

        if (quote.Version != version)
        {
            return ConflictWithCode(VersionConflictCode);
        }

        return QuoteRecipientRules.HasDeliverableAddress(quote.Vehicle.Customer.Email)
            ? null
            : UnprocessableWithCode("quote_customer_email_missing");
    }

    /** A 409 answer carrying the shared `{"code": ...}` body. */
    private static IResult ConflictWithCode(string code) =>
        Results.Json(new ErrorCodeResponse(code), statusCode: StatusCodes.Status409Conflict);

    /** A 422 answer carrying the shared `{"code": ...}` body. */
    private static IResult UnprocessableWithCode(string code) =>
        Results.Json(new ErrorCodeResponse(code), statusCode: StatusCodes.Status422UnprocessableEntity);

    /** Applies a validated status transition and stamps SentAt/DecidedAt, the same way Appointment stamps CompletedAt/CanceledAt. */
    private static void ApplyQuoteStatusTransition(Quote quote, QuoteStatus newStatus)
    {
        quote.Status = newStatus;

        if (newStatus == QuoteStatus.Sent)
        {
            quote.SentAt = DateTime.UtcNow;
        }
        else if (newStatus is QuoteStatus.Accepted or QuoteStatus.Rejected)
        {
            quote.DecidedAt = DateTime.UtcNow;
        }
    }
}
