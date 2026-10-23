using System.Linq.Expressions;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Pricing;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    private const int MaxNotesLength = 1000;
    private const int MaxLineDescriptionLength = 120;
    private const string VersionConflictCode = "quote_version_conflict";

    /** Resolved catalog-or-override values for one quote line (D40). */
    private readonly record struct QuoteLineSnapshot(string Description, decimal NetUnitPrice, int VatRatePercent);

    private static QuoteVehicleSummaryDto ToQuoteVehicleSummaryDto(Vehicle vehicle) => new(
        vehicle.Id,
        vehicle.LicensePlate,
        vehicle.Brand,
        vehicle.Model);

    private static QuoteMechanicSummaryDto? ToQuoteMechanicSummaryDto(Mechanic? mechanic) =>
        mechanic is null ? null : new QuoteMechanicSummaryDto(mechanic.Id, mechanic.Name.ToString());

    private static QuoteLineDto ToQuoteLineDto(QuoteLine line) => new(
        line.Id,
        line.LineKind.ToString(),
        line.PartId,
        line.LaborTypeId,
        line.Description,
        line.Quantity,
        line.NetUnitPrice,
        line.VatRatePercent,
        line.NetAmount,
        line.VatAmount,
        line.GrossAmount,
        line.SortOrder);

    /** Expired is computed, never stored (D7): a Sent quote past its ValidUntil. */
    private static bool ComputeIsExpired(Quote quote, DateTime nowUtc) =>
        quote.Status == QuoteStatus.Sent && quote.ValidUntil < nowUtc;

    /** Server-side list projection: only the mapped columns of the quote, its vehicle and its creator travel,
        with the same expiry rule and formatting as the detail mapping (ProjectionFormat is evaluated client-side). */
    private static Expression<Func<Quote, QuoteListItemDto>> QuoteListItemProjection(DateTime nowUtc) => q => new QuoteListItemDto(
        q.Id,
        q.QuoteNumber,
        q.Title,
        ProjectionFormat.EnumName(q.Status),
        q.Status == QuoteStatus.Sent && q.ValidUntil < nowUtc,
        q.CreatedAt,
        q.ValidUntil,
        q.TotalNet,
        q.TotalVat,
        q.TotalGross,
        q.VehicleId,
        new QuoteVehicleSummaryDto(q.Vehicle.Id, q.Vehicle.LicensePlate, q.Vehicle.Brand, q.Vehicle.Model),
        q.AppointmentId,
        q.CreatedByMechanic == null
            ? null
            : new QuoteMechanicSummaryDto(
                q.CreatedByMechanic.Id,
                ProjectionFormat.FullName(q.CreatedByMechanic.Name.FirstName, q.CreatedByMechanic.Name.MiddleName, q.CreatedByMechanic.Name.LastName)),
        q.Version);

    private static QuoteDetailDto ToQuoteDetailDto(Quote quote, DateTime nowUtc) => new(
        quote.Id,
        quote.QuoteNumber,
        quote.Title,
        quote.Notes,
        quote.Status.ToString(),
        ComputeIsExpired(quote, nowUtc),
        quote.CreatedAt,
        quote.ValidUntil,
        quote.SentAt,
        quote.DecidedAt,
        quote.TotalNet,
        quote.TotalVat,
        quote.TotalGross,
        quote.VehicleId,
        ToQuoteVehicleSummaryDto(quote.Vehicle),
        quote.AppointmentId,
        ToQuoteMechanicSummaryDto(quote.CreatedByMechanic),
        quote.Lines.OrderBy(l => l.SortOrder).Select(ToQuoteLineDto).ToList(),
        quote.Version);

    /** Recomputes every line's amounts via QuoteLineCalculator and the quote's totals via
     * QuoteTotalsCalculator (D19); every line-mutating handler must call this so ValidateQuoteTotals matches on save. */
    private static void RecomputeQuoteTotals(Quote quote)
    {
        foreach (var line in quote.Lines)
        {
            var amounts = QuoteLineCalculator.Calculate(line.Quantity, line.NetUnitPrice, line.VatRatePercent);
            line.NetAmount = amounts.NetAmount;
            line.VatAmount = amounts.VatAmount;
            line.GrossAmount = amounts.GrossAmount;
        }

        var totals = QuoteTotalsCalculator.Calculate(
            quote.Lines.Select(line => new QuoteLineAmounts(line.NetAmount, line.VatAmount, line.GrossAmount)));

        quote.TotalNet = totals.TotalNet;
        quote.TotalVat = totals.TotalVat;
        quote.TotalGross = totals.TotalGross;
    }

    /** Loads a quote (with Vehicle/CreatedByMechanic/Lines) for a write endpoint and applies the
     * shared Draft-only checks in order: exists (404), is Draft (409), version submitted (D38, 422). */
    private static async Task<(Quote? Quote, IResult? Error)> LoadDraftQuoteAsync(
        int id,
        uint version,
        string lockedDetail,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var quote = await IncludeDetails(db.Quotes)
            .FirstOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (quote is null)
        {
            return (null, ApiProblem.NotFound("Quote not found."));
        }

        if (quote.Status != QuoteStatus.Draft)
        {
            return (null, ApiProblem.Conflict(lockedDetail));
        }

        var missingVersionError = OptimisticConcurrency.GetMissingVersionError(version);
        if (missingVersionError is not null)
        {
            return (null, missingVersionError);
        }

        return (quote, null);
    }

    /** Saves under the shared optimistic-concurrency rule (D30/D38): a stale version answers 409 quote_version_conflict. */
    private static Task<IResult?> SaveWithVersionAsync(
        AutoServiceDbContext db,
        Quote quote,
        uint version,
        CancellationToken cancellationToken)
        => OptimisticConcurrency.SaveWithVersionAsync(db, quote, version, VersionConflictCode, cancellationToken);

    /** The navigation set every quote detail response and write handler reads. */
    private static IQueryable<Quote> IncludeDetails(IQueryable<Quote> quotes) => quotes
        .Include(q => q.Vehicle).ThenInclude(v => v.Customer)
        .Include(q => q.CreatedByMechanic)
        .Include(q => q.Lines);

    private static string? GetNotesValidationError(string? notes)
    {
        if (notes is not null && notes.Trim().Length > MaxNotesLength)
        {
            return $"Notes must be at most {MaxNotesLength} characters.";
        }

        return null;
    }

    private static string? NormalizeOptionalNotes(string? notes)
    {
        var trimmed = notes?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }
}
