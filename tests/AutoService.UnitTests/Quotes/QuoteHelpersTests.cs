using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Quotes;
using AutoService.UnitTests.Http;

namespace AutoService.UnitTests.Quotes;

/** The pure quote helpers: expiry, total recomputation, notes rules and the DTO mappings. */
public sealed class QuoteHelpersTests
{
    private static T Call<T>(string name, params object?[] args) => PrivateStatic.Call<T>(typeof(QuoteEndpoints), name, args);

    [Theory]
    [InlineData(QuoteStatus.Sent, -1, true)]
    [InlineData(QuoteStatus.Sent, 0, false)]
    [InlineData(QuoteStatus.Sent, 1, false)]
    [InlineData(QuoteStatus.Draft, -10, false)]
    [InlineData(QuoteStatus.Accepted, -10, false)]
    [InlineData(QuoteStatus.Rejected, -10, false)]
    public void ComputeIsExpired_is_true_only_for_a_sent_quote_past_its_deadline(QuoteStatus status, int validUntilOffsetDays, bool expected)
    {
        var quote = QuoteFixtures.NewQuote(status, QuoteFixtures.Now.AddDays(validUntilOffsetDays));

        Assert.Equal(expected, Call<bool>("ComputeIsExpired", quote, QuoteFixtures.Now));
    }

    [Fact]
    public void RecomputeQuoteTotals_rewrites_every_line_and_the_totals_from_quantity_price_and_vat()
    {
        var quote = QuoteFixtures.NewQuote();
        quote.Lines.Add(QuoteFixtures.NewLine(QuoteLineKind.Part, "Szűrő", 1.5m, 10.10m, 27, 1));
        quote.Lines.Add(QuoteFixtures.NewLine(QuoteLineKind.Labor, "Munka", 2m, 1000m, 27, 2));
        foreach (var line in quote.Lines)
        {
            line.NetAmount = line.VatAmount = line.GrossAmount = 999m;
        }

        PrivateStatic.Run(typeof(QuoteEndpoints), "RecomputeQuoteTotals", [quote]);

        var lines = quote.Lines.OrderBy(l => l.SortOrder).ToList();
        Assert.Equal((15.15m, 4.09m, 19.24m), (lines[0].NetAmount, lines[0].VatAmount, lines[0].GrossAmount));
        Assert.Equal((2000m, 540m, 2540m), (lines[1].NetAmount, lines[1].VatAmount, lines[1].GrossAmount));
        Assert.Equal(2015.15m, quote.TotalNet);
        Assert.Equal(544.09m, quote.TotalVat);
        Assert.Equal(2559.24m, quote.TotalGross);
        Assert.Equal(quote.TotalNet + quote.TotalVat, quote.TotalGross);
    }

    [Fact]
    public void RecomputeQuoteTotals_zeroes_the_totals_of_a_quote_without_lines()
    {
        var quote = QuoteFixtures.NewQuote();
        quote.TotalNet = quote.TotalVat = quote.TotalGross = 123m;

        PrivateStatic.Run(typeof(QuoteEndpoints), "RecomputeQuoteTotals", [quote]);

        Assert.Equal((0m, 0m, 0m), (quote.TotalNet, quote.TotalVat, quote.TotalGross));
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData("  note  ", "note")]
    public void NormalizeOptionalNotes_trims_and_turns_blank_into_null(string? notes, string? expected)
    {
        Assert.Equal(expected, Call<string?>("NormalizeOptionalNotes", [notes]));
    }

    [Fact]
    public void GetNotesValidationError_allows_1000_characters_even_with_surrounding_spaces()
    {
        Assert.Null(Call<string?>("GetNotesValidationError", [new string('n', 1000)]));
        Assert.Null(Call<string?>("GetNotesValidationError", [" " + new string('n', 1000) + " "]));
        Assert.Null(Call<string?>("GetNotesValidationError", [null]));
    }

    [Fact]
    public void GetNotesValidationError_rejects_1001_characters()
    {
        Assert.Equal(
            "Notes must be at most 1000 characters.",
            Call<string?>("GetNotesValidationError", [new string('n', 1001)]));
    }

    [Fact]
    public void ToQuoteLineDto_maps_the_snapshot_amounts_and_the_kind_name()
    {
        var line = QuoteFixtures.NewLine(QuoteLineKind.Labor, "Munka", 2m, 1000m, 27, 4, laborTypeId: 8);

        var dto = Call<QuoteEndpoints.QuoteLineDto>("ToQuoteLineDto", line);

        Assert.Equal("Labor", dto.LineKind);
        Assert.Equal((default(int?), (int?)8), (dto.PartId, dto.LaborTypeId));
        Assert.Equal(("Munka", 2m, 1000m, 27), (dto.Description, dto.Quantity, dto.NetUnitPrice, dto.VatRatePercent));
        Assert.Equal((2000m, 540m, 2540m, 4), (dto.NetAmount, dto.VatAmount, dto.GrossAmount, dto.SortOrder));
    }

    [Fact]
    public void Summary_mappers_carry_the_display_fields_and_tolerate_a_removed_mechanic()
    {
        var vehicle = Call<QuoteEndpoints.QuoteVehicleSummaryDto>("ToQuoteVehicleSummaryDto", QuoteFixtures.NewVehicle());
        var mechanic = Call<QuoteEndpoints.QuoteMechanicSummaryDto?>("ToQuoteMechanicSummaryDto", QuoteFixtures.NewMechanic());
        var removed = Call<QuoteEndpoints.QuoteMechanicSummaryDto?>("ToQuoteMechanicSummaryDto", [null]);

        Assert.Equal(new QuoteEndpoints.QuoteVehicleSummaryDto(3, "ABC-123", "Škoda", "Octavia"), vehicle);
        Assert.Equal(new QuoteEndpoints.QuoteMechanicSummaryDto(5, "Béla Szabó"), mechanic);
        Assert.Null(removed);
    }

    [Fact]
    public void ToQuoteDetailDto_orders_lines_and_reports_the_lock_expiry_and_delete_rules()
    {
        var quote = QuoteFixtures.NewQuote(QuoteStatus.Sent, QuoteFixtures.Now.AddDays(-1), mechanic: QuoteFixtures.NewMechanic());
        quote.Lines.Add(QuoteFixtures.NewLine(QuoteLineKind.Part, "második", 1m, 100m, 27, 2));
        quote.Lines.Add(QuoteFixtures.NewLine(QuoteLineKind.Part, "első", 1m, 100m, 27, 1));

        var locked = Call<QuoteEndpoints.QuoteDetailDto>("ToQuoteDetailDto", quote, QuoteFixtures.Now, "appointment_completed");
        var open = Call<QuoteEndpoints.QuoteDetailDto>("ToQuoteDetailDto", quote, QuoteFixtures.Now, (string?)null);

        Assert.Equal(new[] { "első", "második" }, locked.Lines.Select(l => l.Description).ToArray());
        Assert.Equal("Sent", locked.Status);
        Assert.True(locked.IsExpired);
        Assert.True(locked.IsLocked);
        Assert.Equal("appointment_completed", locked.LockReason);
        Assert.False(open.IsLocked);
        Assert.Null(open.LockReason);
        Assert.False(open.CanDelete);
        Assert.Equal(5, open.CreatedByMechanic?.Id);
        Assert.Equal("ABC-123", open.Vehicle.LicensePlate);
    }

    [Theory]
    [InlineData(QuoteStatus.Draft, true)]
    [InlineData(QuoteStatus.Sent, false)]
    public void ToQuoteDetailDto_lets_only_a_draft_without_an_appointment_be_deleted(QuoteStatus status, bool expected)
    {
        var dto = Call<QuoteEndpoints.QuoteDetailDto>("ToQuoteDetailDto", QuoteFixtures.NewQuote(status), QuoteFixtures.Now, (string?)null);

        Assert.Equal(expected, dto.CanDelete);
    }
}
