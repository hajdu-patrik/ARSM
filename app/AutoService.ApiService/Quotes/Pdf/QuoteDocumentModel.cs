namespace AutoService.ApiService.Quotes.Pdf;

/**
 * One printed quote line. Flat on purpose: the document layer never touches an
 * EF entity, so a lazy-loading surprise cannot happen while a page is being
 * rendered, and the model can be built once and reused for every page.
 *
 * Identifier is the part number for a part line and the labor code for a labor
 * line. It comes from the live catalog rather than the line snapshot, because
 * the snapshot keeps the description, the price and the VAT rate only; it is
 * null once the catalog entry is gone or the line was written by hand.
 */
internal sealed record QuoteDocumentLine(
    string Description,
    string? Identifier,
    decimal Quantity,
    decimal NetUnitPrice,
    int VatRatePercent,
    decimal NetAmount,
    decimal VatAmount,
    decimal GrossAmount);

/** One VAT rate with the tax base and the tax charged on it. */
internal sealed record QuoteDocumentVatRow(
    int VatRatePercent,
    decimal NetAmount,
    decimal VatAmount);

/** The customer the quote is addressed to. */
internal sealed record QuoteDocumentCustomer(
    string Name,
    string? PhoneNumber,
    string? Email);

/** The vehicle the quote is anchored to. */
internal sealed record QuoteDocumentVehicle(
    string LicensePlate,
    string Vin,
    string Brand,
    string Model,
    int Year);

/**
 * Everything the quote PDF prints, resolved ahead of rendering.
 *
 * Part and labor lines are kept apart because the two blocks print different
 * column headers: pieces at a unit price against hours at an hourly rate.
 */
internal sealed record QuoteDocumentModel(
    string QuoteNumber,
    string Title,
    string? Notes,
    string StatusLabel,
    bool IsExpired,
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
