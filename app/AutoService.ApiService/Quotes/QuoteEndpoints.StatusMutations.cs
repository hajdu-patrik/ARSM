using AutoService.ApiService.Data;
using AutoService.ApiService.Email;
using AutoService.ApiService.Email.Sending;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;

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

    /** Transitions a quote to a new status; Draft->Sent requires at least one line (D21), and
     * SentAt/DecidedAt are stamped the same way Appointment stamps CompletedAt/CanceledAt. */
    private static async Task<IResult> ChangeQuoteStatusAsync(
        int id,
        ChangeQuoteStatusRequest request,
        AutoServiceDbContext db,
        IEmailSender emailSender,
        EmailSettings emailSettings,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<QuoteStatus>(request.Status, ignoreCase: true, out var newStatus))
        {
            return ApiProblem.Unprocessable($"Status must be one of: {string.Join(", ", Enum.GetNames<QuoteStatus>())}.");
        }

        var quote = await IncludeDetails(db.Quotes)
            .FirstOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (quote is null)
        {
            return ApiProblem.NotFound("Quote not found.");
        }

        if (!IsAllowedQuoteStatusTransition(quote.Status, newStatus))
        {
            return ApiProblem.Conflict($"Cannot transition a quote from {quote.Status} to {newStatus}.");
        }

        var missingVersionError = OptimisticConcurrency.GetMissingVersionError(request.Version);
        if (missingVersionError is not null)
        {
            return missingVersionError;
        }

        if (newStatus == QuoteStatus.Sent && quote.Lines.Count == 0)
        {
            return ApiProblem.Conflict("A quote must have at least one line before it can be sent.");
        }

        if (newStatus == QuoteStatus.Sent)
        {
            var mailer = new QuoteSentMailer(emailSender, emailSettings, loggerFactory.CreateLogger<QuoteSentMailer>());
            var sendError = await SendQuoteMailAsync(quote, request.Version, mailer, db, cancellationToken);
            if (sendError is not null)
            {
                return sendError;
            }
        }

        ApplyQuoteStatusTransition(quote, newStatus);

        var saveError = await SaveWithVersionAsync(db, quote, request.Version, cancellationToken);
        if (saveError is not null)
        {
            return saveError;
        }

        return Results.Ok(ToQuoteDetailDto(quote, DateTime.UtcNow));
    }

    /** E-mails the quote PDF to the customer; the mail goes out before the save so Sent is only ever
     * stored after Resend accepted the message (user decision 2026-10-23). Returns the error result or null. */
    private static async Task<IResult?> SendQuoteMailAsync(
        Quote quote,
        uint version,
        QuoteSentMailer mailer,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (quote.Version != version)
        {
            return ConflictWithCode(VersionConflictCode);
        }

        if (string.IsNullOrWhiteSpace(quote.Vehicle.Customer.Email))
        {
            return ConflictWithCode("quote_customer_email_missing");
        }

        var company = await db.CompanyProfiles.AsNoTracking().FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("Company profile row is missing.");
        var profile = company.ToProfile();
        var pdf = await RenderQuotePdfAsync(quote, profile, db, cancellationToken);
        var result = await mailer.SendAsync(quote, profile, pdf, cancellationToken);

        return result.Sent ? null : ConflictWithCode("quote_email_failed");
    }

    /** A 409 answer carrying the shared `{"code": ...}` body. */
    private static IResult ConflictWithCode(string code) =>
        Results.Json(new ErrorCodeResponse(code), statusCode: StatusCodes.Status409Conflict);

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
