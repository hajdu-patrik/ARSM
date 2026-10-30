using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Quotes.Pdf;

namespace AutoService.UnitTests.Quotes;

/** The printed money, quantity, date and status text are pinned to Hungarian regardless of the server locale. */
public sealed class QuoteDocumentFormattingTests
{
    /** Group separators differ between ICU versions (no-break or narrow no-break space); compare with a plain space. */
    private static string Plain(string text) => text.Replace(' ', ' ').Replace(' ', ' ');

    [Theory]
    [InlineData("2540", "2 540 Ft")]
    [InlineData("1234.5", "1 235 Ft")]
    [InlineData("1234.49", "1 234 Ft")]
    [InlineData("0.5", "1 Ft")]
    [InlineData("0", "0 Ft")]
    [InlineData("100000000", "100 000 000 Ft")]
    public void FormatAmount_prints_whole_forints_rounded_away_from_zero(string amount, string expected)
    {
        Assert.Equal(expected, Plain(QuoteDocumentFormatting.FormatAmount(decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture))));
    }

    [Theory]
    [InlineData("4500", "4 500,00 Ft")]
    [InlineData("10.1", "10,10 Ft")]
    [InlineData("0", "0,00 Ft")]
    public void FormatUnitPrice_keeps_two_decimals_with_a_decimal_comma(string amount, string expected)
    {
        Assert.Equal(expected, Plain(QuoteDocumentFormatting.FormatUnitPrice(decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture))));
    }

    [Theory]
    [InlineData("2", false, "2 db")]
    [InlineData("1000", false, "1 000 db")]
    [InlineData("1.5", true, "1,50 óra")]
    [InlineData("0.25", true, "0,25 óra")]
    [InlineData("3", true, "3 óra")]
    public void FormatQuantity_drops_the_decimals_of_whole_numbers_and_names_the_unit(string quantity, bool isLabor, string expected)
    {
        var parsed = decimal.Parse(quantity, System.Globalization.CultureInfo.InvariantCulture);

        Assert.Equal(expected, Plain(QuoteDocumentFormatting.FormatQuantity(parsed, isLabor)));
    }

    [Fact]
    public void FormatDate_uses_the_hungarian_long_numeric_form()
    {
        Assert.Equal("2026. 09. 14.", QuoteDocumentFormatting.FormatDate(new DateTime(2026, 9, 14)));
        Assert.Equal("2026. 01. 05.", QuoteDocumentFormatting.FormatDate(new DateTime(2026, 1, 5, 23, 59, 0)));
    }

    [Theory]
    [InlineData(5, "5%")]
    [InlineData(27, "27%")]
    public void FormatVatRate_appends_a_percent_sign(int rate, string expected)
    {
        Assert.Equal(expected, QuoteDocumentFormatting.FormatVatRate(rate));
    }

    [Theory]
    [InlineData(QuoteStatus.Draft, "Piszkozat")]
    [InlineData(QuoteStatus.Sent, "Kiküldve")]
    [InlineData(QuoteStatus.Accepted, "Elfogadva")]
    [InlineData(QuoteStatus.Rejected, "Elutasítva")]
    public void ResolveStatusLabel_names_every_stored_status_in_hungarian(QuoteStatus status, string expected)
    {
        Assert.Equal(expected, QuoteDocumentFormatting.ResolveStatusLabel(status, isExpired: false));
    }

    [Fact]
    public void ResolveStatusLabel_prints_an_expired_quote_as_expired_so_the_paper_cannot_claim_to_be_live()
    {
        Assert.Equal("Lejárt", QuoteDocumentFormatting.ResolveStatusLabel(QuoteStatus.Sent, isExpired: true));
    }

    [Fact]
    public void Every_quote_status_has_a_printed_label()
    {
        foreach (var status in Enum.GetValues<QuoteStatus>())
        {
            Assert.False(string.IsNullOrWhiteSpace(QuoteDocumentFormatting.ResolveStatusLabel(status, false)));
        }
    }
}
