using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Quotes;
using AutoService.ApiService.Quotes.Pdf;
using AutoService.UnitTests.Http;

namespace AutoService.UnitTests.Quotes;

/** The render model is a flat copy of the stored quote: amounts as stored, kinds split, VAT grouped by rate. */
public sealed class QuoteDocumentModelMappingTests
{
    private static readonly Dictionary<(QuoteLineKind, int), string> NoIdentifiers = [];

    private static QuoteDocumentModel Map(
        ApiService.Domain.Quote quote,
        Dictionary<(QuoteLineKind, int), string>? identifiers = null) =>
        PrivateStatic.Call<QuoteDocumentModel>(
            typeof(QuoteEndpoints), "ToQuoteDocumentModel", quote, identifiers ?? NoIdentifiers, QuoteFixtures.Now);

    private static ApiService.Domain.Quote QuoteWithLines()
    {
        var quote = QuoteFixtures.NewQuote(QuoteStatus.Accepted, mechanic: QuoteFixtures.NewMechanic());
        quote.Lines.Add(QuoteFixtures.NewLine(QuoteLineKind.Labor, "Munka", 2m, 1000m, 27, 3, laborTypeId: 8));
        quote.Lines.Add(QuoteFixtures.NewLine(QuoteLineKind.Part, "Olajszűrő", 1m, 5000m, 18, 2, partId: 4));
        quote.Lines.Add(QuoteFixtures.NewLine(QuoteLineKind.Part, "Olaj", 4m, 2500m, 27, 1));
        quote.TotalNet = 17000m;
        quote.TotalVat = 3800m;
        quote.TotalGross = 20800m;
        return quote;
    }

    [Fact]
    public void Header_customer_vehicle_and_totals_are_copied_from_the_quote()
    {
        var model = Map(QuoteWithLines());

        Assert.Equal(("ARSM-2026-0001", "Olajcsere", "Megjegyzés", "Elfogadva"), (model.QuoteNumber, model.Title, model.Notes, model.StatusLabel));
        Assert.Equal(new QuoteDocumentCustomer("Anna Mária Kovács", "+36201234567", "anna@example.test"), model.Customer);
        Assert.Equal(new QuoteDocumentVehicle("ABC-123", "WVWZZZAUZJW123456", "Škoda", "Octavia", 2018), model.Vehicle);
        Assert.Equal("Béla Szabó", model.CreatedByMechanicName);
        Assert.Equal((17000m, 3800m, 20800m), (model.TotalNet, model.TotalVat, model.TotalGross));
    }

    [Fact]
    public void Part_and_labor_lines_are_split_and_each_block_follows_the_sort_order()
    {
        var model = Map(QuoteWithLines());

        Assert.Equal(new[] { "Olaj", "Olajszűrő" }, model.PartLines.Select(l => l.Description).ToArray());
        Assert.Equal(new[] { "Munka" }, model.LaborLines.Select(l => l.Description).ToArray());
    }

    [Fact]
    public void Line_amounts_are_the_stored_ones_and_never_recomputed()
    {
        var quote = QuoteWithLines();
        var first = quote.Lines.Single(l => l.Description == "Olaj");
        first.NetAmount = 123.45m;
        first.GrossAmount = 234.56m;

        var line = Map(quote).PartLines[0];

        Assert.Equal((4m, 2500m, 27), (line.Quantity, line.NetUnitPrice, line.VatRatePercent));
        Assert.Equal((123.45m, 234.56m), (line.NetAmount, line.GrossAmount));
    }

    [Fact]
    public void The_identifier_comes_from_the_live_catalog_by_kind_and_id_and_is_null_when_unknown()
    {
        var identifiers = new Dictionary<(QuoteLineKind, int), string>
        {
            [(QuoteLineKind.Part, 4)] = "OLF-1001",
            [(QuoteLineKind.Labor, 8)] = "OLAJCSERE",
            [(QuoteLineKind.Labor, 4)] = "WRONG-KIND",
        };

        var model = Map(QuoteWithLines(), identifiers);

        Assert.Null(model.PartLines[0].Identifier);
        Assert.Equal("OLF-1001", model.PartLines[1].Identifier);
        Assert.Equal("OLAJCSERE", model.LaborLines[0].Identifier);
        Assert.Null(Map(QuoteWithLines()).PartLines[1].Identifier);
    }

    [Fact]
    public void The_vat_breakdown_groups_by_rate_in_ascending_order_and_sums_stored_amounts()
    {
        var rows = Map(QuoteWithLines()).VatBreakdown;

        Assert.Equal(new[] { 18, 27 }, rows.Select(r => r.VatRatePercent).ToArray());
        Assert.Equal((5000m, 900m), (rows[0].NetAmount, rows[0].VatAmount));
        Assert.Equal((12000m, 3240m), (rows[1].NetAmount, rows[1].VatAmount));
    }

    [Fact]
    public void A_quote_without_lines_or_creator_maps_to_empty_blocks_and_no_author()
    {
        var model = Map(QuoteFixtures.NewQuote());

        Assert.Empty(model.PartLines);
        Assert.Empty(model.LaborLines);
        Assert.Empty(model.VatBreakdown);
        Assert.Null(model.CreatedByMechanicName);
    }

    [Fact]
    public void A_sent_quote_past_its_deadline_prints_the_expired_label()
    {
        var model = Map(QuoteFixtures.NewQuote(QuoteStatus.Sent, QuoteFixtures.Now.AddDays(-2)));

        Assert.Equal("Lejárt", model.StatusLabel);
    }
}
