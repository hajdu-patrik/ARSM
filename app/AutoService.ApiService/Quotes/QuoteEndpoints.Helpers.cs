using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Pricing;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    private const int MaxNotesLength = 1000;
    private const int MaxLineDescriptionLength = 120;

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

    private static QuoteListItemDto ToQuoteListItemDto(Quote quote, DateTime nowUtc) => new(
        quote.Id,
        quote.QuoteNumber,
        quote.Title,
        quote.Status.ToString(),
        ComputeIsExpired(quote, nowUtc),
        quote.CreatedAt,
        quote.ValidUntil,
        quote.TotalNet,
        quote.TotalVat,
        quote.TotalGross,
        quote.VehicleId,
        ToQuoteVehicleSummaryDto(quote.Vehicle),
        quote.AppointmentId,
        ToQuoteMechanicSummaryDto(quote.CreatedByMechanic),
        quote.Version);

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
        var quote = await db.Quotes
            .Include(q => q.Vehicle)
            .Include(q => q.CreatedByMechanic)
            .Include(q => q.Lines)
            .FirstOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (quote is null)
        {
            return (null, Results.Problem(detail: "Quote not found.", statusCode: StatusCodes.Status404NotFound));
        }

        if (quote.Status != QuoteStatus.Draft)
        {
            return (null, Results.Problem(detail: lockedDetail, statusCode: StatusCodes.Status409Conflict));
        }

        var missingVersionError = GetMissingVersionError(version);
        if (missingVersionError is not null)
        {
            return (null, missingVersionError);
        }

        return (quote, null);
    }

    /** Rejects a request missing the concurrency version (D38); Postgres never assigns xmin 0 to a
     * live row, so the uint default is unambiguously "missing," never a real stale value. */
    private static IResult? GetMissingVersionError(uint version)
    {
        if (version == 0)
        {
            return Results.Problem(
                detail: "Version is required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        return null;
    }

    /** The 409 response for a stale optimistic-concurrency version (D30, D38). */
    private static IResult QuoteVersionConflictResult() =>
        Results.Conflict(new ErrorCodeResponse("quote_version_conflict"));

    /** Seeds the concurrency token's original value with the client-submitted version (D30/D38), so
     * SaveChangesAsync compares against it instead of whatever was loaded; the only way to check the private-setter xmin-mapped Version. */
    private static void SeedOriginalVersion(AutoServiceDbContext db, Quote quote, uint version)
    {
        db.Entry(quote).Property(q => q.Version).OriginalValue = version;
    }

    /** Normalizes a DateTime to UTC, the same rule AppointmentEndpoints uses: since JSON deserializers
     * often strip Kind, Unspecified is treated as already UTC, not local time. */
    private static DateTime NormalizeToUtc(DateTime dateTime) => dateTime.Kind switch
    {
        DateTimeKind.Utc => dateTime,
        DateTimeKind.Local => dateTime.ToUniversalTime(),
        _ => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc)
    };

    /** Validates the optional quote notes field (D14). */
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
