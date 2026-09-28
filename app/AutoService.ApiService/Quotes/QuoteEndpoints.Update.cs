using AutoService.ApiService.Data;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /** Edits a quote header (Title, Notes); Draft only (D7), a plain Status != Draft check, since
     * ValidUntil extension has its own endpoint and its own Sent-state exception (D23). */
    private static async Task<IResult> UpdateQuoteAsync(
        int id,
        UpdateQuoteRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var (quote, loadError) = await LoadDraftQuoteAsync(
            id, request.Version, "Only draft quotes can be edited.", db, cancellationToken);

        if (loadError is not null)
        {
            return loadError;
        }

        var titleError = QuoteValidation.GetTitleValidationError(request.Title);
        if (titleError is not null)
        {
            return Results.Problem(detail: titleError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var notesError = GetNotesValidationError(request.Notes);
        if (notesError is not null)
        {
            return Results.Problem(detail: notesError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        quote!.Title = request.Title.Trim();
        quote.Notes = NormalizeOptionalNotes(request.Notes);

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

    /** Extends a quote's validity (D22/D23): any future date while Draft, only a strictly later
     * date while Sent, 409 once Accepted/Rejected; the sole exception to the Draft-only lock elsewhere. */
    private static async Task<IResult> ExtendQuoteValidityAsync(
        int id,
        ExtendQuoteValidityRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var quote = await db.Quotes
            .Include(q => q.Vehicle)
            .Include(q => q.CreatedByMechanic)
            .Include(q => q.Lines)
            .FirstOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (quote is null)
        {
            return Results.Problem(detail: "Quote not found.", statusCode: StatusCodes.Status404NotFound);
        }

        if (quote.Status is QuoteStatus.Accepted or QuoteStatus.Rejected)
        {
            return Results.Problem(
                detail: "Validity cannot be changed on a decided quote.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var missingVersionError = GetMissingVersionError(request.Version);
        if (missingVersionError is not null)
        {
            return missingVersionError;
        }

        var newValidUntil = NormalizeToUtc(request.ValidUntil);
        var nowUtc = DateTime.UtcNow;

        // A past date is rejected regardless of status (D22): matters on an already-expired Sent
        // quote, where a date later than the current ValidUntil can still itself be in the past.
        var validUntilError = QuoteValidation.GetValidUntilValidationError(newValidUntil, nowUtc);
        if (validUntilError is not null)
        {
            return Results.Problem(detail: validUntilError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        // Sent additionally allows extension only (D23): the single exception
        // to the D7 lock, narrowed to strictly later dates.
        if (quote.Status == QuoteStatus.Sent && newValidUntil <= quote.ValidUntil)
        {
            return Results.Problem(
                detail: "ValidUntil can only be extended to a later date while the quote is sent.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        quote.ValidUntil = newValidUntil;

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
}
