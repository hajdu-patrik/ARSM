using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /**
     * The quote status state machine (D7), enforced in this one place:
     * Draft to Sent; Sent to Accepted or Rejected; Accepted and Rejected
     * are terminal. Every other transition is rejected by the caller.
     *
     * @param from Current quote status.
     * @param to Requested new quote status.
     * @return Whether the transition is allowed.
     */
    private static bool IsAllowedQuoteStatusTransition(QuoteStatus from, QuoteStatus to) => (from, to) switch
    {
        (QuoteStatus.Draft, QuoteStatus.Sent) => true,
        (QuoteStatus.Sent, QuoteStatus.Accepted) => true,
        (QuoteStatus.Sent, QuoteStatus.Rejected) => true,
        _ => false
    };

    /**
     * Transitions a quote to a new status. Draft to Sent requires at least
     * one line (D21); SentAt/DecidedAt are stamped the same way
     * Appointment stamps CompletedAt/CanceledAt.
     *
     * @param id Quote identifier.
     * @param request New status with the expected concurrency version.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @return The updated quote, or a validation/conflict/not-found result.
     */
    private static async Task<IResult> ChangeQuoteStatusAsync(
        int id,
        ChangeQuoteStatusRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<QuoteStatus>(request.Status, ignoreCase: true, out var newStatus))
        {
            return Results.Problem(
                detail: $"Status must be one of: {string.Join(", ", Enum.GetNames<QuoteStatus>())}.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var quote = await db.Quotes
            .Include(q => q.Vehicle)
            .Include(q => q.CreatedByMechanic)
            .Include(q => q.Lines)
            .FirstOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (quote is null)
        {
            return Results.Problem(detail: "Quote not found.", statusCode: StatusCodes.Status404NotFound);
        }

        if (!IsAllowedQuoteStatusTransition(quote.Status, newStatus))
        {
            return Results.Problem(
                detail: $"Cannot transition a quote from {quote.Status} to {newStatus}.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var missingVersionError = GetMissingVersionError(request.Version);
        if (missingVersionError is not null)
        {
            return missingVersionError;
        }

        if (newStatus == QuoteStatus.Sent && quote.Lines.Count == 0)
        {
            return Results.Problem(
                detail: "A quote must have at least one line before it can be sent.",
                statusCode: StatusCodes.Status409Conflict);
        }

        ApplyQuoteStatusTransition(quote, newStatus);

        SeedOriginalVersion(db, quote, request.Version);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return QuoteVersionConflictResult();
        }

        return Results.Ok(ToQuoteDetailDto(quote, DateTime.UtcNow));
    }

    /**
     * Applies a validated status transition and stamps SentAt/DecidedAt,
     * the same way Appointment stamps CompletedAt/CanceledAt.
     *
     * @param quote The quote being transitioned.
     * @param newStatus The already-validated new status.
     */
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
