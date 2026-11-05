using System.Text;
using AutoService.ApiService.Configuration;
using AutoService.ApiService.Quotes.Pdf;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace AutoService.UnitTests.Quotes;

/** The printable quote renders to a valid PDF for the full, the sparse and the very long document. */
public sealed class QuoteDocumentPdfTests
{
    private static readonly object Gate = new();
    private static bool configured;

    private static readonly CompanyProfile Company =
        new("Teszt Autószerviz Kft.", "Fő utca 1.", "1111", "Budapest", "11111111-1-11", "+36 1 111 1111", "info@example.test");

    private static void Configure()
    {
        lock (Gate)
        {
            if (configured)
            {
                return;
            }

            // Same settings as Program.cs: embedded fonts only, and a missing glyph is an error.
            QuestPDF.Settings.License = LicenseType.Community;
            QuestPDF.Settings.UseSystemFonts = false;
            QuestPDF.Settings.ThrowOnMissingTextGlyphs = true;
            QuoteDocumentAssets.RegisterFonts();
            configured = true;
        }
    }

    private static QuoteDocumentLine Line(string description, string? identifier = "OLF-1001", decimal quantity = 2m) =>
        new(description, identifier, quantity, 4500m, 27, quantity * 4500m, quantity * 4500m * 1.27m);

    private static QuoteDocumentModel Model(
        IReadOnlyList<QuoteDocumentLine> parts,
        IReadOnlyList<QuoteDocumentLine> labor,
        string? notes = "Megjegyzés: árajánlat érvényes.",
        QuoteDocumentCustomer? customer = null,
        string? mechanic = "Szabó Béla") => new(
        "ARSM-2026-0001",
        "Olajcsere és szűrők",
        notes,
        "Kiküldve",
        new DateTime(2026, 10, 1),
        new DateTime(2026, 10, 31),
        customer ?? new QuoteDocumentCustomer("Kovács Mária", "+36201234567", "anna@example.test"),
        new QuoteDocumentVehicle("ABC-123", "WVWZZZAUZJW123456", "Škoda", "Octavia", 2018),
        mechanic,
        parts,
        labor,
        [new QuoteDocumentVatRow(27, 18000m, 4860m)],
        18000m,
        4860m,
        22860m);

    private static byte[] Render(QuoteDocumentModel model)
    {
        Configure();
        return new QuoteDocument(model, Company).GeneratePdf();
    }

    private static void AssertValidPdf(byte[] pdf)
    {
        Assert.True(pdf.Length > 1000, "A rendered quote is never a tiny file.");
        Assert.Equal("%PDF-", Encoding.ASCII.GetString(pdf, 0, 5));
        Assert.Contains("%%EOF", Encoding.ASCII.GetString(pdf, pdf.Length - 32, 32));
    }

    [Fact]
    public void A_full_quote_with_parts_labor_notes_and_accented_text_renders()
    {
        var model = Model([Line("Olajszűrő őűÁÉÍÓÖÜ")], [Line("Munkadíj", "OLAJCSERE", 1.5m)]);

        AssertValidPdf(Render(model));
    }

    [Fact]
    public void A_quote_without_lines_still_renders_with_empty_blocks()
    {
        AssertValidPdf(Render(Model([], [])));
    }

    [Fact]
    public void A_quote_without_notes_phone_email_or_author_renders()
    {
        var model = Model([Line("Olaj", identifier: null)], [], notes: null, customer: new QuoteDocumentCustomer("Kovács Mária", null, null), mechanic: null);

        AssertValidPdf(Render(model));
    }

    [Fact]
    public void A_whitespace_only_note_is_treated_like_no_note()
    {
        AssertValidPdf(Render(Model([Line("Olaj")], [], notes: "   ")));
    }

    [Fact]
    public void A_long_quote_flows_onto_further_pages_and_is_larger_than_a_short_one()
    {
        var many = Enumerable.Range(1, 120).Select(i => Line($"Alkatrész {i} hosszú megnevezéssel a tördelés próbájához")).ToList();

        var shortPdf = Render(Model([Line("Olaj")], []));
        var longPdf = Render(Model(many, many));

        AssertValidPdf(longPdf);
        Assert.True(longPdf.Length > shortPdf.Length);
    }

    [Fact]
    public void Text_with_characters_the_font_cannot_draw_still_renders()
    {
        var model = Model([Line("Szűrő ✓")], [Line("Munka 油", "OLAJCSERE", 1m)], notes: "Köszönjük 🙂") with { Title = "Szerviz ★" };
        var company = Company with { Name = "Teszt ✓ Kft." };

        Configure();
        AssertValidPdf(new QuoteDocument(model, company).GeneratePdf());
    }

    [Fact]
    public void Undrawable_characters_become_a_question_mark_while_accents_and_line_breaks_stay()
    {
        Configure();

        Assert.Equal("Szűrő ? ? ?\nŐű x", QuoteDocumentText.Clean("Szűrő ✓ 🙂 油\nŐű x"));
    }

    [Fact]
    public void Every_hungarian_letter_is_kept_and_a_text_without_undrawable_characters_is_unchanged()
    {
        Configure();
        const string hungarian = "áéíóöőúüűÁÉÍÓÖŐÚÜŰ Árvíztűrő tükörfúrógép";

        Assert.Equal(hungarian, QuoteDocumentText.Clean(hungarian));
        Assert.Equal(string.Empty, QuoteDocumentText.Clean(string.Empty));
    }

    [Fact]
    public void Cleaning_a_model_replaces_the_undrawable_characters_in_every_user_text()
    {
        Configure();
        var model = Model([Line("Szűrő ✓")], [Line("Munka 油", "ID 🙂", 1m)], notes: "Köszönjük 🙂") with { Title = "Szerviz ★" };

        var clean = QuoteDocumentText.Clean(model);

        Assert.Equal("Szerviz ?", clean.Title);
        Assert.Equal("Köszönjük ?", clean.Notes);
        Assert.Equal("Szűrő ?", clean.PartLines[0].Description);
        Assert.Equal("Munka ?", clean.LaborLines[0].Description);
        Assert.Equal("ID ?", clean.LaborLines[0].Identifier);
    }

    [Fact]
    public void The_embedded_logo_is_a_png_and_the_font_family_is_noto_sans()
    {
        Assert.True(QuoteDocumentAssets.Logo.Length > 8);
        Assert.Equal(new byte[] { 0x89, 0x50, 0x4E, 0x47 }, QuoteDocumentAssets.Logo[..4]);
        Assert.Equal("Noto Sans", QuoteDocumentAssets.FontFamily);
    }
}
