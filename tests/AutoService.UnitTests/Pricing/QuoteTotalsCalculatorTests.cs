using AutoService.ApiService.Pricing;

namespace AutoService.UnitTests.Pricing;

/** Quote totals: plain sums of the stored line amounts, gross by addition, never re-rounded. */
public sealed class QuoteTotalsCalculatorTests
{
    [Fact]
    public void Calculate_sums_the_lines_and_adds_net_and_vat()
    {
        var totals = QuoteTotalsCalculator.Calculate(
        [
            new QuoteLineAmounts(15.15m, 4.09m, 19.24m),
            new QuoteLineAmounts(2000m, 540m, 2540m),
        ]);

        Assert.Equal(2015.15m, totals.TotalNet);
        Assert.Equal(544.09m, totals.TotalVat);
        Assert.Equal(2559.24m, totals.TotalGross);
    }

    [Fact]
    public void Calculate_of_no_lines_is_zero()
    {
        Assert.Equal(new QuoteTotals(0m, 0m, 0m), QuoteTotalsCalculator.Calculate([]));
    }

    [Fact]
    public void Calculate_keeps_the_CK_Quotes_Totals_invariant()
    {
        var totals = QuoteTotalsCalculator.Calculate(
        [
            new QuoteLineAmounts(0.33m, 0.09m, 0.42m),
            new QuoteLineAmounts(0.33m, 0.09m, 0.42m),
            new QuoteLineAmounts(0.34m, 0.09m, 0.43m),
        ]);

        Assert.Equal(totals.TotalNet + totals.TotalVat, totals.TotalGross);
    }

    [Fact]
    public void Calculate_of_one_line_is_that_line()
    {
        var totals = QuoteTotalsCalculator.Calculate([new QuoteLineAmounts(100m, 27m, 127m)]);

        Assert.Equal(new QuoteTotals(100m, 27m, 127m), totals);
    }

    [Fact]
    public void Calculate_does_not_round_the_sums()
    {
        var totals = QuoteTotalsCalculator.Calculate([new QuoteLineAmounts(0.005m, 0.001m, 0.006m), new QuoteLineAmounts(0.005m, 0.001m, 0.006m)]);

        Assert.Equal(0.010m, totals.TotalNet);
        Assert.Equal(0.002m, totals.TotalVat);
        Assert.Equal(0.012m, totals.TotalGross);
    }
}
