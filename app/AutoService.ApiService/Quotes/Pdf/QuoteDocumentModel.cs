namespace AutoService.ApiService.Quotes.Pdf;

/** One printed quote line; flat so the document never touches an EF entity (no lazy-loading during
 * render). Identifier comes from the live catalog, not the snapshot (CLAUDE.md Quote Anchors); null when orphaned/hand-written. */
internal sealed record QuoteDocumentLine(
    string Description,
    string? Identifier,
    decimal Quantity,
    decimal NetUnitPrice,
    int VatRatePercent,
    decimal NetAmount,
    decimal GrossAmount);

internal sealed record QuoteDocumentVatRow(
    int VatRatePercent,
    decimal NetAmount,
    decimal VatAmount);

internal sealed record QuoteDocumentCustomer(
    string Name,
    string? PhoneNumber,
    string? Email);

internal sealed record QuoteDocumentVehicle(
    string LicensePlate,
    string Vin,
    string Brand,
    string Model,
    int Year);

/** Everything the quote PDF prints, resolved ahead of rendering; part/labor lines are kept
 * apart because the two blocks print different column headers (unit price vs hourly rate). */
internal sealed record QuoteDocumentModel(
    string QuoteNumber,
    string Title,
    string? Notes,
    string StatusLabel,
    DateTime CreatedAt,
    DateTime ValidUntil,
    QuoteDocumentCustomer Customer,
    QuoteDocumentVehicle Vehicle,
    string? CreatedByMechanicName,
    IReadOnlyList<QuoteDocumentLine> PartLines,
    IReadOnlyList<QuoteDocumentLine> LaborLines,
    IReadOnlyList<QuoteDocumentVatRow> VatBreakdown,
    decimal TotalNet,
    decimal TotalVat,
    decimal TotalGross);
