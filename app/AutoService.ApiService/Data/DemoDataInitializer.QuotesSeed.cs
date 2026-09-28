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

    /** Inserts demo quotes missing by QuoteNumber (D12/D13); needs already-persisted Vehicle/Mechanic/
     * Part/LaborType rows, hence its own partial (unlike DB-access-free DemoDataPricingSeedFactory); idempotent. */
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

        // A dev database can drift from the demo roster (e.g. a removed mechanic); an
        // unresolvable reference skips that one quote instead of throwing and crashing startup.
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

    /** Checks that every natural-key reference a demo quote seed depends on is present, so BuildQuote/BuildQuoteLine's lookups cannot throw. */
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

    /** Pure data for 3 demo quotes (D12): Accepted + Sent-valid + Sent-expired, covering the
     * F6 pending-vs-expired split (D25); fixed QuoteNumbers avoid colliding with QuoteNumberGenerator's sequence. */
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

    /** Builds one Quote with its lines; amounts always come from Pricing/QuoteLineCalculator and
     * QuoteTotalsCalculator (never hand-typed) so ValidateQuoteTotals accepts the row; SortOrder starts at 1 (D41). */
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

    /** Builds one QuoteLine, snapshotting Description/NetUnitPrice/VatRatePercent from the catalog entry (D4, D5) and computing amounts via QuoteLineCalculator. */
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
