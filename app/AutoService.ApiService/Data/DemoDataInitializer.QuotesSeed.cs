using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Pricing;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.DataInitialization;

public static partial class DemoDataInitializer
{
    /** One demo quote line before its catalog id is resolved (D4, D5). */
    private readonly record struct DemoQuoteLineSeed(QuoteLineKind LineKind, string CatalogCode, decimal Quantity);

    /** One demo quote before its Vehicle/Mechanic ids are resolved (D12). */
    private readonly record struct DemoQuoteSeed(
        string QuoteNumber,
        string Title,
        string VehicleLicensePlate,
        string CreatedByMechanicEmail,
        QuoteStatus Status,
        DateTime CreatedAt,
        DateTime ValidUntil,
        DateTime? SentAt,
        DateTime? DecidedAt,
        IReadOnlyList<DemoQuoteLineSeed> Lines);

    /**
     * Inserts the demo quotes from CreateQuoteSeeds() that are missing by
     * QuoteNumber (D12, D13). Needs already-persisted Vehicle, Mechanic,
     * Part, and LaborType rows, which is why this seed step lives in its
     * own DemoDataInitializer partial instead of the DB-access-free
     * DemoDataPricingSeedFactory, whose doc comment scopes it to pure data
     * with no database access. Never overwrites or duplicates an
     * already-seeded quote on a later restart.
     *
     * @param db Database context used to look up catalog/vehicle/mechanic rows and insert the missing quotes.
     * @param cancellationToken Token used to cancel the seeding I/O.
     * @return A task that completes when the quote seed has converged.
     */
    private static async Task EnsureQuotesSeededAsync(AutoServiceDbContext db, CancellationToken cancellationToken)
    {
        var existingQuoteNumbers = await db.Quotes
            .Select(q => q.QuoteNumber)
            .ToListAsync(cancellationToken);
        var existingQuoteNumberSet = existingQuoteNumbers.ToHashSet(StringComparer.Ordinal);

        var missingSeeds = CreateQuoteSeeds()
            .Where(seed => !existingQuoteNumberSet.Contains(seed.QuoteNumber))
            .ToList();

        if (missingSeeds.Count == 0)
        {
            return;
        }

        var vehicleIdsByPlate = await db.Vehicles.AsNoTracking()
            .ToDictionaryAsync(v => v.LicensePlate, v => v.Id, cancellationToken);
        var mechanicIdsByEmail = await db.Mechanics.AsNoTracking()
            .ToDictionaryAsync(m => m.Email, m => m.Id, cancellationToken);
        var partsByCode = await db.Parts.AsNoTracking()
            .ToDictionaryAsync(p => p.PartNumber, p => p, cancellationToken);
        var laborTypesByCode = await db.LaborTypes.AsNoTracking()
            .ToDictionaryAsync(l => l.Code, l => l, cancellationToken);

        // A developer database can drift from the canonical demo roster - a
        // mechanic removed by earlier test activity, for example. Demo quotes
        // are a convenience, not a runtime invariant, so an unresolvable
        // reference skips that one quote instead of throwing
        // KeyNotFoundException and taking application startup down with it.
        var resolvableSeeds = missingSeeds
            .Where(seed => CanResolveSeed(seed, vehicleIdsByPlate, mechanicIdsByEmail, partsByCode, laborTypesByCode))
            .ToList();

        if (resolvableSeeds.Count == 0)
        {
            return;
        }

        foreach (var seed in resolvableSeeds)
        {
            db.Quotes.Add(BuildQuote(seed, vehicleIdsByPlate, mechanicIdsByEmail, partsByCode, laborTypesByCode));
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    /**
     * Checks that every natural-key reference a demo quote seed depends on is
     * actually present, so the dictionary lookups in BuildQuote and
     * BuildQuoteLine cannot throw.
     *
     * @param seed The demo quote seed to check.
     * @param vehicleIdsByPlate Already-seeded vehicle ids keyed by LicensePlate.
     * @param mechanicIdsByEmail Already-seeded mechanic ids keyed by Email.
     * @param partsByCode Already-seeded parts keyed by PartNumber.
     * @param laborTypesByCode Already-seeded labor types keyed by Code.
     * @return Whether the seed can be built from the rows currently present.
     */
    private static bool CanResolveSeed(
        DemoQuoteSeed seed,
        IReadOnlyDictionary<string, int> vehicleIdsByPlate,
        IReadOnlyDictionary<string, int> mechanicIdsByEmail,
        IReadOnlyDictionary<string, Part> partsByCode,
        IReadOnlyDictionary<string, LaborType> laborTypesByCode)
        => vehicleIdsByPlate.ContainsKey(seed.VehicleLicensePlate)
            && mechanicIdsByEmail.ContainsKey(seed.CreatedByMechanicEmail)
            && seed.Lines.All(line => line.LineKind == QuoteLineKind.Part
                ? partsByCode.ContainsKey(line.CatalogCode)
                : laborTypesByCode.ContainsKey(line.CatalogCode));

    /**
     * Pure data for the 3 demo quotes required by D12: one Accepted quote
     * (the F6 revenue base, D8), one Sent quote still inside its validity
     * window, and one Sent quote whose ValidUntil has already passed,
     * which is what exercises the pending-vs-expired split in the F6
     * report (D25). A Draft is left out: it is the least useful status for
     * F5/F6, and 3 quotes already cover Accepted/Sent-valid/Sent-expired.
     * CreatedAt values land in three different 2026 months so the F6
     * monthly breakdown has more than one month to show (D17, D28).
     * QuoteNumbers are fixed literals, not derived from the current date,
     * so they stay stable across reseeds and never collide with
     * Quotes/QuoteNumberGenerator's own year-scoped sequence.
     */
    private static List<DemoQuoteSeed> CreateQuoteSeeds() =>
    [
        new(
            QuoteNumber: "ARSM-2026-0001",
            Title: "Oil change service",
            VehicleLicensePlate: "ABC-101",
            CreatedByMechanicEmail: "gabor.kovacs@example.com",
            Status: QuoteStatus.Accepted,
            CreatedAt: new DateTime(2026, 6, 10, 9, 0, 0, DateTimeKind.Utc),
            ValidUntil: new DateTime(2026, 7, 10, 9, 0, 0, DateTimeKind.Utc),
            SentAt: new DateTime(2026, 6, 11, 10, 30, 0, DateTimeKind.Utc),
            DecidedAt: new DateTime(2026, 6, 14, 14, 0, 0, DateTimeKind.Utc),
            Lines:
            [
                new(QuoteLineKind.Part, "OLF-1001", 1m),
                new(QuoteLineKind.Labor, "OLAJCSERE", 1m)
            ]),
        new(
            QuoteNumber: "ARSM-2026-0002",
            Title: "Brake system inspection",
            VehicleLicensePlate: "BCD-202",
            CreatedByMechanicEmail: "mate.szabo@example.com",
            Status: QuoteStatus.Sent,
            CreatedAt: new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            ValidUntil: new DateTime(2026, 9, 19, 9, 0, 0, DateTimeKind.Utc),
            SentAt: new DateTime(2026, 8, 21, 11, 0, 0, DateTimeKind.Utc),
            DecidedAt: null,
            Lines:
            [
                new(QuoteLineKind.Part, "FBP-2001", 1m),
                new(QuoteLineKind.Labor, "FEKJAVITAS", 1.5m)
            ]),
        new(
            QuoteNumber: "ARSM-2026-0003",
            Title: "Engine diagnostics and spark plug replacement",
            VehicleLicensePlate: "DEF-404",
            CreatedByMechanicEmail: "mate.szabo@example.com",
            Status: QuoteStatus.Sent,
            CreatedAt: new DateTime(2026, 7, 5, 8, 0, 0, DateTimeKind.Utc),
            ValidUntil: new DateTime(2026, 8, 4, 8, 0, 0, DateTimeKind.Utc),
            SentAt: new DateTime(2026, 7, 6, 9, 0, 0, DateTimeKind.Utc),
            DecidedAt: null,
            Lines:
            [
                new(QuoteLineKind.Part, "GYG-5001", 4m),
                new(QuoteLineKind.Labor, "DIAGNOSZTIKA", 1m)
            ])
    ];

    /**
     * Builds one Quote with its lines, computing every amount through
     * Pricing/QuoteLineCalculator and Pricing/QuoteTotalsCalculator (never
     * a hand-typed literal) so AutoServiceDbContext.ValidateQuoteTotals
     * accepts the row on save. SortOrder is server-assigned per line,
     * starting at 1 (D41).
     *
     * @param seed Pure quote data with natural-key catalog/vehicle/mechanic references.
     * @param vehicleIdsByPlate Already-seeded vehicle ids keyed by LicensePlate.
     * @param mechanicIdsByEmail Already-seeded mechanic ids keyed by Email.
     * @param partsByCode Already-seeded parts keyed by PartNumber.
     * @param laborTypesByCode Already-seeded labor types keyed by Code.
     * @return The fully assembled, not-yet-tracked Quote entity.
     */
    private static Quote BuildQuote(
        DemoQuoteSeed seed,
        IReadOnlyDictionary<string, int> vehicleIdsByPlate,
        IReadOnlyDictionary<string, int> mechanicIdsByEmail,
        IReadOnlyDictionary<string, Part> partsByCode,
        IReadOnlyDictionary<string, LaborType> laborTypesByCode)
    {
        var quote = new Quote(
            seed.Title,
            null,
            seed.ValidUntil,
            vehicleIdsByPlate[seed.VehicleLicensePlate],
            null,
            mechanicIdsByEmail[seed.CreatedByMechanicEmail])
        {
            QuoteNumber = seed.QuoteNumber,
            Status = seed.Status,
            CreatedAt = seed.CreatedAt,
            SentAt = seed.SentAt,
            DecidedAt = seed.DecidedAt
        };

        var sortOrder = 1;
        foreach (var lineSeed in seed.Lines)
        {
            var line = BuildQuoteLine(lineSeed, partsByCode, laborTypesByCode);
            line.AssignSortOrder(sortOrder++);
            quote.Lines.Add(line);
        }

        var totals = QuoteTotalsCalculator.Calculate(
            quote.Lines.Select(line => new QuoteLineAmounts(line.NetAmount, line.VatAmount, line.GrossAmount)));
        quote.TotalNet = totals.TotalNet;
        quote.TotalVat = totals.TotalVat;
        quote.TotalGross = totals.TotalGross;

        return quote;
    }

    /**
     * Builds one QuoteLine, snapshotting Description/NetUnitPrice/
     * VatRatePercent from the seeded Part or LaborType catalog entry
     * (D4, D5) and computing amounts via QuoteLineCalculator.
     *
     * @param lineSeed Line kind, catalog natural key, and quantity.
     * @param partsByCode Already-seeded parts keyed by PartNumber.
     * @param laborTypesByCode Already-seeded labor types keyed by Code.
     * @return The fully assembled, not-yet-tracked QuoteLine entity.
     */
    private static QuoteLine BuildQuoteLine(
        DemoQuoteLineSeed lineSeed,
        IReadOnlyDictionary<string, Part> partsByCode,
        IReadOnlyDictionary<string, LaborType> laborTypesByCode)
    {
        var (description, netUnitPrice, vatRatePercent, partId, laborTypeId) = lineSeed.LineKind == QuoteLineKind.Part
            ? ToLineSnapshot(partsByCode[lineSeed.CatalogCode])
            : ToLineSnapshot(laborTypesByCode[lineSeed.CatalogCode]);

        var amounts = QuoteLineCalculator.Calculate(lineSeed.Quantity, netUnitPrice, vatRatePercent);

        return new QuoteLine(
            lineSeed.LineKind,
            description,
            lineSeed.Quantity,
            netUnitPrice,
            vatRatePercent,
            amounts.NetAmount,
            amounts.VatAmount,
            amounts.GrossAmount,
            partId,
            laborTypeId);
    }

    private static (string Description, decimal NetUnitPrice, int VatRatePercent, int? PartId, int? LaborTypeId) ToLineSnapshot(Part part)
        => (part.Name, part.NetUnitPrice, part.VatRatePercent, part.Id, null);

    private static (string Description, decimal NetUnitPrice, int VatRatePercent, int? PartId, int? LaborTypeId) ToLineSnapshot(LaborType laborType)
        => (laborType.Name, laborType.HourlyNetRate, laborType.VatRatePercent, null, laborType.Id);
}
