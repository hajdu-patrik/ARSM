using System.Collections.Concurrent;
using System.Text;
using AutoService.ApiService.Configuration;
using QuestPDF.Fluent;
using SkiaSharp;

namespace AutoService.ApiService.Quotes.Pdf;

/** Replaces every character the PDF fonts cannot draw with '?' before rendering, so a stray emoji or symbol in
 * user text prints as '?' instead of failing the PDF; the glyph check of Program.cs still guards the fonts. */
internal static class QuoteDocumentText
{
    internal const string Replacement = "?";

    // Hungarian letters are never replaced: a font lacking them must still fail the render (ThrowOnMissingTextGlyphs).
    private const string HungarianLetters = "áéíóöőúüűÁÉÍÓÖŐÚÜŰ";

    private static readonly Lazy<SKTypeface[]> Faces = new(LoadFaces, LazyThreadSafetyMode.ExecutionAndPublication);
    private static readonly ConcurrentDictionary<int, bool> Verdicts = new();

    /** The model with every user-entered text cleaned; numbers, dates and the status label are untouched. */
    internal static QuoteDocumentModel Clean(QuoteDocumentModel model) => model with
    {
        QuoteNumber = Clean(model.QuoteNumber),
        Title = Clean(model.Title),
        Notes = CleanOptional(model.Notes),
        Customer = new QuoteDocumentCustomer(
            Clean(model.Customer.Name), CleanOptional(model.Customer.PhoneNumber), CleanOptional(model.Customer.Email)),
        Vehicle = model.Vehicle with
        {
            LicensePlate = Clean(model.Vehicle.LicensePlate),
            Vin = Clean(model.Vehicle.Vin),
            Brand = Clean(model.Vehicle.Brand),
            Model = Clean(model.Vehicle.Model),
        },
        CreatedByMechanicName = CleanOptional(model.CreatedByMechanicName),
        PartLines = model.PartLines.Select(CleanLine).ToList(),
        LaborLines = model.LaborLines.Select(CleanLine).ToList(),
    };

    /** The letterhead with every field cleaned, because an admin types it. */
    internal static CompanyProfile Clean(CompanyProfile company) => new(
        Clean(company.Name),
        Clean(company.AddressLine),
        Clean(company.PostalCode),
        Clean(company.City),
        Clean(company.TaxNumber),
        Clean(company.PhoneNumber),
        Clean(company.Email));

    /** Keeps line breaks, tabs and every code point both faces (or QuestPDF's own fallback) can draw; one rune becomes one '?'. */
    internal static string Clean(string text)
    {
        var builder = new StringBuilder(text.Length);
        foreach (var rune in text.EnumerateRunes())
        {
            builder.Append(IsPrintable(rune) ? rune.ToString() : Replacement);
        }

        return builder.ToString();
    }

    private static string? CleanOptional(string? text) => text is null ? null : Clean(text);

    private static QuoteDocumentLine CleanLine(QuoteDocumentLine line) => line with
    {
        Description = Clean(line.Description),
        Identifier = CleanOptional(line.Identifier),
    };

    private static bool IsPrintable(Rune rune) =>
        rune.Value is '\n' or '\r' or '\t'
        || (rune.IsBmp && HungarianLetters.Contains((char)rune.Value))
        || Verdicts.GetOrAdd(rune.Value, CanDraw);

    /** Computed once per code point; SKTypeface is immutable and thread-safe, so concurrent renders share the cache. */
    private static bool CanDraw(int codePoint) =>
        Faces.Value.All(face => HasGlyph(face, codePoint)) || ProbeQuestPdf(codePoint);

    private static bool HasGlyph(SKTypeface face, int codePoint)
    {
        using var font = new SKFont(face);
        return font.ContainsGlyph(codePoint);
    }

    /** QuestPDF also draws from its own bundled fallback faces (e.g. arrows), so a rune the Noto faces lack is
     * test-rendered once (regular and bold) and the verdict cached; only a rune QuestPDF cannot draw becomes '?'. */
    private static bool ProbeQuestPdf(int codePoint)
    {
        try
        {
            var glyph = char.ConvertFromUtf32(codePoint);
            Document.Create(container => container.Page(page => page.Content().Text(text =>
                {
                    text.Span(glyph).FontFamily(QuoteDocumentAssets.FontFamily);
                    text.Span(glyph).FontFamily(QuoteDocumentAssets.FontFamily).Bold();
                })))
                .GeneratePdf();
            return true;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            // A rune the layout cannot draw or shape (control characters included) is treated as not drawable.
            return false;
        }
    }

    private static SKTypeface[] LoadFaces() =>
        QuoteDocumentAssets.FontFaces()
            .Select(bytes => SKTypeface.FromData(SKData.CreateCopy(bytes))
                ?? throw new InvalidOperationException("An embedded quote PDF font could not be loaded."))
            .ToArray();
}
