using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /**
     * Adds a line to a draft quote. Order: load with lines, check the
     * Draft lock, check the version, check the 200-line cap (D24), resolve
     * the catalog-or-override snapshot (D40), recompute totals, save.
     *
     * @param id Quote identifier.
     * @param request Line payload with the expected concurrency version.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @return The updated quote, or a validation/conflict/not-found result.
     */
    private static async Task<IResult> AddQuoteLineAsync(
        int id,
        CreateQuoteLineRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var (quote, loadError) = await LoadDraftQuoteAsync(
            id, request.Version, "Lines can only be added while the quote is a draft.", db, cancellationToken);

        if (loadError is not null)
        {
            return loadError;
        }

        var lineCountError = QuoteValidation.GetLineCountValidationError(quote!.Lines.Count);
        if (lineCountError is not null)
        {
            return Results.Problem(detail: lineCountError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var lineKindError = TryParseLineRequestBasics(request.LineKind, request.Quantity, out var lineKind);
        if (lineKindError is not null)
        {
            return lineKindError;
        }

        var (snapshot, resolveError) = await ResolveQuoteLineSnapshotAsync(
            lineKind,
            request.PartId,
            request.LaborTypeId,
            request.Description,
            request.NetUnitPrice,
            request.VatRatePercent,
            db,
            cancellationToken);

        if (resolveError is not null)
        {
            return resolveError;
        }

        var line = new QuoteLine(
            lineKind,
            snapshot.Description,
            request.Quantity,
            snapshot.NetUnitPrice,
            snapshot.VatRatePercent,
            netAmount: 0m,
            vatAmount: 0m,
            grossAmount: 0m,
            request.PartId,
            request.LaborTypeId);

        var nextSortOrder = quote.Lines.Count == 0 ? 1 : quote.Lines.Max(l => l.SortOrder) + 1;
        line.AssignSortOrder(nextSortOrder);

        quote.Lines.Add(line);
        RecomputeQuoteTotals(quote);

        SeedOriginalVersion(db, quote, request.Version);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return QuoteVersionConflictResult();
        }

        return Results.Created($"/api/quotes/{quote.Id}", ToQuoteDetailDto(quote, DateTime.UtcNow));
    }

    /**
     * Updates a line on a draft quote. Same order as add: load with lines,
     * Draft lock, version, resolve snapshot, recompute totals, save. No
     * 200-line cap here since the line count does not change.
     *
     * @param id Quote identifier.
     * @param lineId Line identifier.
     * @param request Line payload with the expected concurrency version.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @return The updated quote, or a validation/conflict/not-found result.
     */
    private static async Task<IResult> UpdateQuoteLineAsync(
        int id,
        int lineId,
        UpdateQuoteLineRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var (quote, loadError) = await LoadDraftQuoteAsync(
            id, request.Version, "Lines can only be edited while the quote is a draft.", db, cancellationToken);

        if (loadError is not null)
        {
            return loadError;
        }

        var line = quote!.Lines.FirstOrDefault(l => l.Id == lineId);
        if (line is null)
        {
            return Results.Problem(detail: "Quote line not found.", statusCode: StatusCodes.Status404NotFound);
        }

        var lineKindError = TryParseLineRequestBasics(request.LineKind, request.Quantity, out var lineKind);
        if (lineKindError is not null)
        {
            return lineKindError;
        }

        var (snapshot, resolveError) = await ResolveQuoteLineSnapshotAsync(
            lineKind,
            request.PartId,
            request.LaborTypeId,
            request.Description,
            request.NetUnitPrice,
            request.VatRatePercent,
            db,
            cancellationToken);

        if (resolveError is not null)
        {
            return resolveError;
        }

        line.LineKind = lineKind;
        line.PartId = request.PartId;
        line.LaborTypeId = request.LaborTypeId;
        line.Description = snapshot.Description;
        line.Quantity = request.Quantity;
        line.NetUnitPrice = snapshot.NetUnitPrice;
        line.VatRatePercent = snapshot.VatRatePercent;

        RecomputeQuoteTotals(quote);

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
     * Removes a line from a draft quote (D39: version arrives as a query
     * parameter on DELETE). The quote itself survives, so the response is
     * the updated quote, not 204, matching the Appointments unclaim and
     * unassign precedent for removing a sub-resource.
     *
     * @param id Quote identifier.
     * @param lineId Line identifier.
     * @param version Client-submitted concurrency version.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @return The updated quote, or a validation/conflict/not-found result.
     */
    private static async Task<IResult> DeleteQuoteLineAsync(
        int id,
        int lineId,
        uint version,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var (quote, loadError) = await LoadDraftQuoteAsync(
            id, version, "Lines can only be removed while the quote is a draft.", db, cancellationToken);

        if (loadError is not null)
        {
            return loadError;
        }

        var line = quote!.Lines.FirstOrDefault(l => l.Id == lineId);
        if (line is null)
        {
            return Results.Problem(detail: "Quote line not found.", statusCode: StatusCodes.Status404NotFound);
        }

        quote.Lines.Remove(line);
        RecomputeQuoteTotals(quote);

        SeedOriginalVersion(db, quote, version);

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
