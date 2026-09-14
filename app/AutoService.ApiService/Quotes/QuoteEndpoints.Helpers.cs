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

    /**
     * Recomputes every line's net/VAT/gross amounts via QuoteLineCalculator
     * and the quote's totals via QuoteTotalsCalculator (D19). The single
     * place any mutation that adds, edits, or removes a line must call
     * afterward, so the C# handler, the PDF, and the SQL revenue
     * aggregation never disagree, and so AutoServiceDbContext.
     * ValidateQuoteTotals sees matching numbers on save.
     *
     * @param quote The quote whose Lines collection is loaded and current.
     */
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

    /**
     * Loads a quote with Vehicle, CreatedByMechanic, and Lines for a write
     * endpoint, and applies the checks every Draft-only mutation shares, in
     * order: exists (404), is Draft (409, with the given detail), and the
     * concurrency version was submitted (D38, 422).
     *
     * @param id Quote identifier.
     * @param version Client-submitted concurrency version.
     * @param lockedDetail Problem detail used when the quote is not a Draft.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @return The loaded quote, or an error IResult for the caller to return as-is.
     */
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

    /**
     * Parses LineKind and validates Quantity, shared by the add- and
     * update-line handlers (D24).
     *
     * @param lineKindRaw The raw LineKind string from the request.
     * @param quantity The requested quantity.
     * @param lineKind The parsed line kind, valid only when this returns null.
     * @return An error IResult when invalid, otherwise null.
     */
    private static IResult? TryParseLineRequestBasics(string lineKindRaw, decimal quantity, out QuoteLineKind lineKind)
    {
        if (!Enum.TryParse(lineKindRaw, ignoreCase: true, out lineKind))
        {
            return Results.Problem(
                detail: $"LineKind must be one of: {string.Join(", ", Enum.GetNames<QuoteLineKind>())}.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var quantityError = PricingValidation.GetQuantityValidationError(quantity);
        if (quantityError is not null)
        {
            return Results.Problem(detail: quantityError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        return null;
    }

    /**
     * Enforces line-kind integrity (D4, D5) ahead of
     * CK_QuoteLines_LineKindIntegrity: a Part line must not carry a
     * LaborTypeId and vice versa.
     *
     * @param lineKind Whether this is a part or a labor line.
     * @param partId Optional part catalog reference.
     * @param laborTypeId Optional labor type catalog reference.
     * @return A 422 IResult when the references conflict with the kind, otherwise null.
     */
    private static IResult? GetLineKindIntegrityError(QuoteLineKind lineKind, int? partId, int? laborTypeId)
    {
        if (lineKind == QuoteLineKind.Part && laborTypeId is not null)
        {
            return Results.Problem(
                detail: "A part line cannot reference a labor type.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (lineKind == QuoteLineKind.Labor && partId is not null)
        {
            return Results.Problem(
                detail: "A labor line cannot reference a part.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        return null;
    }

    /**
     * Loads the Part or LaborType snapshot for a quote line when a catalog
     * id is given (D4, D5, D40).
     *
     * @param lineKind Whether this is a part or a labor line.
     * @param partId Optional part catalog reference.
     * @param laborTypeId Optional labor type catalog reference.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @return The catalog snapshot (null when no catalog id was given), or a 404 error IResult.
     */
    private static async Task<(QuoteLineSnapshot? Catalog, IResult? Error)> TryLoadCatalogSnapshotAsync(
        QuoteLineKind lineKind,
        int? partId,
        int? laborTypeId,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (lineKind == QuoteLineKind.Part && partId is not null)
        {
            var part = await db.Parts.AsNoTracking().FirstOrDefaultAsync(p => p.Id == partId, cancellationToken);
            if (part is null)
            {
                return (null, Results.Problem(detail: "Part not found.", statusCode: StatusCodes.Status404NotFound));
            }

            return (new QuoteLineSnapshot(part.Name, part.NetUnitPrice, part.VatRatePercent), null);
        }

        if (lineKind == QuoteLineKind.Labor && laborTypeId is not null)
        {
            var laborType = await db.LaborTypes.AsNoTracking().FirstOrDefaultAsync(l => l.Id == laborTypeId, cancellationToken);
            if (laborType is null)
            {
                return (null, Results.Problem(detail: "Labor type not found.", statusCode: StatusCodes.Status404NotFound));
            }

            return (new QuoteLineSnapshot(laborType.Name, laborType.HourlyNetRate, laborType.VatRatePercent), null);
        }

        return (null, null);
    }

    /**
     * Validates the resolved description length and the money/VAT bounds
     * shared by every quote line, catalog-sourced or manual (D24).
     *
     * @param description The resolved (post-override) description.
     * @param netUnitPrice The resolved net unit price (or net hourly rate).
     * @param vatRatePercent The resolved VAT rate.
     * @return A 422 IResult when out of bounds, otherwise null.
     */
    private static IResult? GetLineSnapshotFieldError(string description, decimal netUnitPrice, int vatRatePercent)
    {
        if (description.Length > MaxLineDescriptionLength)
        {
            return Results.Problem(
                detail: $"Description must be at most {MaxLineDescriptionLength} characters.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var moneyError = PricingValidation.GetMoneyAmountValidationError(netUnitPrice);
        if (moneyError is not null)
        {
            return Results.Problem(detail: moneyError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var vatError = PricingValidation.GetVatRateValidationError(vatRatePercent);
        if (vatError is not null)
        {
            return Results.Problem(detail: vatError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        return null;
    }

    /**
     * Resolves the description, net unit price, and VAT rate for a quote
     * line (D40). When a catalog id is given, the three values snapshot
     * from the Part or LaborType entry (D4, D5), but any override field
     * present on the request wins over the snapshot. When no catalog id is
     * given, all three fields are required from the request.
     *
     * @param lineKind Whether this is a part or a labor line.
     * @param partId Optional part catalog reference.
     * @param laborTypeId Optional labor type catalog reference.
     * @param description Optional override description.
     * @param netUnitPrice Optional override net unit price (or net hourly rate for labor).
     * @param vatRatePercent Optional override VAT rate.
     * @param db Database context used to look up the catalog reference.
     * @param cancellationToken Request cancellation token.
     * @return The resolved snapshot, or an error IResult for the caller to return as-is.
     */
    private static async Task<(QuoteLineSnapshot Snapshot, IResult? Error)> ResolveQuoteLineSnapshotAsync(
        QuoteLineKind lineKind,
        int? partId,
        int? laborTypeId,
        string? description,
        decimal? netUnitPrice,
        int? vatRatePercent,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var integrityError = GetLineKindIntegrityError(lineKind, partId, laborTypeId);
        if (integrityError is not null)
        {
            return (default, integrityError);
        }

        var (catalog, catalogError) = await TryLoadCatalogSnapshotAsync(lineKind, partId, laborTypeId, db, cancellationToken);
        if (catalogError is not null)
        {
            return (default, catalogError);
        }

        var resolvedDescription = !string.IsNullOrWhiteSpace(description) ? description.Trim() : catalog?.Description;
        var resolvedNetUnitPrice = netUnitPrice ?? catalog?.NetUnitPrice;
        var resolvedVatRatePercent = vatRatePercent ?? catalog?.VatRatePercent;

        if (resolvedDescription is null || resolvedNetUnitPrice is null || resolvedVatRatePercent is null)
        {
            return (default, Results.Problem(
                detail: "Description, NetUnitPrice, and VatRatePercent are required when no catalog reference is provided.",
                statusCode: StatusCodes.Status422UnprocessableEntity));
        }

        var fieldError = GetLineSnapshotFieldError(resolvedDescription, resolvedNetUnitPrice.Value, resolvedVatRatePercent.Value);
        if (fieldError is not null)
        {
            return (default, fieldError);
        }

        return (new QuoteLineSnapshot(resolvedDescription, resolvedNetUnitPrice.Value, resolvedVatRatePercent.Value), null);
    }

    /**
     * Rejects a request that omitted the optimistic-concurrency version
     * (D38). Postgres never assigns the reserved transaction id 0 as a
     * live row xmin value, so an unset uint field (the JSON/query-binding
     * default) is unambiguous as missing, not a legitimate stale value.
     *
     * @param version The version value taken from the request body or query string.
     * @return A 422 IResult when missing, otherwise null.
     */
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

    /**
     * Seeds the concurrency token original value with the version the
     * client submitted, so SaveChangesAsync compares against the client
     * expectation instead of whatever this request happened to load
     * (D30, D38). Quote.Version has a private setter and maps to the
     * Postgres xmin system column, so this EF Core API is the only way to
     * make the update statement check it.
     *
     * @param db Database context tracking the quote.
     * @param quote The tracked quote entity about to be saved.
     * @param version The version the client submitted.
     */
    private static void SeedOriginalVersion(AutoServiceDbContext db, Quote quote, uint version)
    {
        db.Entry(quote).Property(q => q.Version).OriginalValue = version;
    }

    /**
     * Normalizes a DateTime to UTC, the same rule AppointmentEndpoints
     * uses: JSON deserializers often strip Kind information, so
     * Unspecified is treated as already UTC rather than local time.
     *
     * @param dateTime The candidate date/time value.
     * @return The date/time value normalized to UTC.
     */
    private static DateTime NormalizeToUtc(DateTime dateTime) => dateTime.Kind switch
    {
        DateTimeKind.Utc => dateTime,
        DateTimeKind.Local => dateTime.ToUniversalTime(),
        _ => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc)
    };

    /**
     * Validates the optional quote notes field (D14).
     *
     * @param notes The candidate notes value.
     * @return Validation message when invalid; otherwise null.
     */
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
