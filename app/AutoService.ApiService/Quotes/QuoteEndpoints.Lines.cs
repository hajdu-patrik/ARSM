using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /** Adds a line to a draft quote: load with lines, Draft lock, version, 200-line cap (D24),
     * catalog-or-override snapshot (D40), recompute totals, save. */
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

    /** Updates a line on a draft quote; same order as add (load, Draft lock, version, snapshot,
     * recompute, save) but no 200-line cap since the line count doesn't change. */
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

    /** Removes a line from a draft quote (D39: version as a query param on DELETE); the quote
     * survives so the response is the updated quote, not 204 (matches the Appointments unclaim/unassign precedent). */
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
