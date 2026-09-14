using AutoService.ApiService.Configuration;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Quotes.Pdf;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /**
     * Returns the quote as a PDF file. Every status is printable (D29): a
     * mechanic needs the paper for review and for handing it over before the
     * quote is sent, and the document names its own status so nobody is
     * misled.
     *
     * @param id Quote identifier.
     * @param company Configured workshop identity resolved at startup (D18, D26).
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @return The PDF file, or 404 when the quote does not exist.
     */
    private static async Task<IResult> GetQuotePdfAsync(
        int id,
        CompanyProfile company,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var quote = await db.Quotes
            .AsNoTracking()
            .Include(q => q.Vehicle).ThenInclude(v => v.Customer)
            .Include(q => q.CreatedByMechanic)
            .Include(q => q.Lines)
            .FirstOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (quote is null)
        {
            return Results.Problem(detail: "Quote not found.", statusCode: StatusCodes.Status404NotFound);
        }

        var identifiers = await LoadCatalogIdentifiersAsync(quote, db, cancellationToken);
        var model = ToQuoteDocumentModel(quote, identifiers, DateTime.UtcNow);
        var pdfBytes = new QuoteDocument(model, company).GeneratePdf();

        return Results.File(pdfBytes, "application/pdf", $"{quote.QuoteNumber}.pdf");
    }

    /**
     * Loads the part numbers and labor codes for the referenced catalog
     * entries. These are not part of the line snapshot, so they come from the
     * live catalog and stay absent for a hand-written line or a deleted entry.
     *
     * @param quote The quote whose lines are printed.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @return Catalog identifiers keyed by line kind and catalog id.
     */
    private static async Task<Dictionary<(QuoteLineKind Kind, int CatalogId), string>> LoadCatalogIdentifiersAsync(
        Quote quote,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var partIds = quote.Lines.Where(l => l.PartId is not null).Select(l => l.PartId!.Value).Distinct().ToList();
        var laborTypeIds = quote.Lines.Where(l => l.LaborTypeId is not null).Select(l => l.LaborTypeId!.Value).Distinct().ToList();
        var identifiers = new Dictionary<(QuoteLineKind, int), string>();

        if (partIds.Count > 0)
        {
            var parts = await db.Parts
                .AsNoTracking()
                .Where(p => partIds.Contains(p.Id))
                .Select(p => new { p.Id, p.PartNumber })
                .ToListAsync(cancellationToken);

            foreach (var part in parts)
            {
                identifiers[(QuoteLineKind.Part, part.Id)] = part.PartNumber;
            }
        }

        if (laborTypeIds.Count > 0)
        {
            var laborTypes = await db.LaborTypes
                .AsNoTracking()
                .Where(l => laborTypeIds.Contains(l.Id))
                .Select(l => new { l.Id, l.Code })
                .ToListAsync(cancellationToken);

            foreach (var laborType in laborTypes)
            {
                identifiers[(QuoteLineKind.Labor, laborType.Id)] = laborType.Code;
            }
        }

        return identifiers;
    }

    /**
     * Flattens the quote into the render model. Amounts are taken as stored,
     * never recomputed here: the PDF has to show the same figures as the
     * screen and the revenue report.
     *
     * @param quote The quote being printed.
     * @param identifiers Catalog identifiers resolved for the referenced lines.
     * @param nowUtc Current UTC instant used for the expiry flag.
     * @return The render model.
     */
    private static QuoteDocumentModel ToQuoteDocumentModel(
        Quote quote,
        IReadOnlyDictionary<(QuoteLineKind Kind, int CatalogId), string> identifiers,
        DateTime nowUtc)
    {
        var isExpired = ComputeIsExpired(quote, nowUtc);
        var orderedLines = quote.Lines.OrderBy(l => l.SortOrder).ToList();

        return new QuoteDocumentModel(
            quote.QuoteNumber,
            quote.Title,
            quote.Notes,
            QuoteDocumentFormatting.ResolveStatusLabel(quote.Status, isExpired),
            isExpired,
            quote.CreatedAt,
            quote.ValidUntil,
            new QuoteDocumentCustomer(
                quote.Vehicle.Customer.Name.ToString(),
                quote.Vehicle.Customer.PhoneNumber,
                quote.Vehicle.Customer.Email),
            new QuoteDocumentVehicle(
                quote.Vehicle.LicensePlate,
                quote.Vehicle.Vin,
                quote.Vehicle.Brand,
                quote.Vehicle.Model,
                quote.Vehicle.Year),
            quote.CreatedByMechanic?.Name.ToString(),
            ToDocumentLines(orderedLines, QuoteLineKind.Part, identifiers),
            ToDocumentLines(orderedLines, QuoteLineKind.Labor, identifiers),
            ToVatBreakdown(orderedLines),
            quote.TotalNet,
            quote.TotalVat,
            quote.TotalGross);
    }

    /**
     * Projects the lines of one kind, keeping their stored order.
     *
     * @param lines Ordered quote lines.
     * @param lineKind Kind to project.
     * @param identifiers Catalog identifiers resolved for the referenced lines.
     * @return Printable lines of that kind.
     */
    private static List<QuoteDocumentLine> ToDocumentLines(
        IEnumerable<QuoteLine> lines,
        QuoteLineKind lineKind,
        IReadOnlyDictionary<(QuoteLineKind Kind, int CatalogId), string> identifiers)
    {
        return lines
            .Where(line => line.LineKind == lineKind)
            .Select(line =>
            {
                var catalogId = lineKind == QuoteLineKind.Part ? line.PartId : line.LaborTypeId;
                var identifier = catalogId is not null && identifiers.TryGetValue((lineKind, catalogId.Value), out var value)
                    ? value
                    : null;

                return new QuoteDocumentLine(
                    line.Description,
                    identifier,
                    line.Quantity,
                    line.NetUnitPrice,
                    line.VatRatePercent,
                    line.NetAmount,
                    line.VatAmount,
                    line.GrossAmount);
            })
            .ToList();
    }

    /**
     * Groups the stored line amounts per VAT rate.
     *
     * @param lines Ordered quote lines.
     * @return One row per VAT rate present on the quote, lowest rate first.
     */
    private static List<QuoteDocumentVatRow> ToVatBreakdown(IEnumerable<QuoteLine> lines)
    {
        return lines
            .GroupBy(line => line.VatRatePercent)
            .OrderBy(group => group.Key)
            .Select(group => new QuoteDocumentVatRow(
                group.Key,
                group.Sum(line => line.NetAmount),
                group.Sum(line => line.VatAmount)))
            .ToList();
    }
}
