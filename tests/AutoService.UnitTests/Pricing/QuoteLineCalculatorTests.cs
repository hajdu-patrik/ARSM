using AutoService.ApiService.Pricing;

namespace AutoService.UnitTests.Pricing;

/** Line amounts: net and VAT rounded on their own, gross by addition, never by a gross-rate multiplication. */
public sealed class QuoteLineCalculatorTests
{
    [Fact]
    public void Calculate_rounds_net_and_vat_separately_and_adds_them()
    {
        var amounts = QuoteLineCalculator.Calculate(quantity: 1.5m, netUnitPrice: 10.10m, vatRatePercent: 27);

        Assert.Equal(15.15m, amounts.NetAmount);
        Assert.Equal(4.09m, amounts.VatAmount);
        Assert.Equal(19.24m, amounts.GrossAmount);
    }

    [Fact]
    public void Calculate_gross_is_the_sum_even_where_a_gross_rate_would_differ()
    {
        // net 0.345 -> 0.35, VAT 5 % of 0.35 -> 0.02, gross 0.37; a 1.05 multiplication of the raw 0.345 would give 0.36.
        var amounts = QuoteLineCalculator.Calculate(quantity: 1m, netUnitPrice: 0.345m, vatRatePercent: 5);

        Assert.Equal(0.35m, amounts.NetAmount);
        Assert.Equal(0.02m, amounts.VatAmount);
        Assert.Equal(0.37m, amounts.GrossAmount);
    }

    [Theory]
    [InlineData(2, 1000, 27, 2000, 540, 2540)]
    [InlineData(0.5, 999.99, 18, 500.00, 90.00, 590.00)]
    [InlineData(3, 0, 5, 0, 0, 0)]
    public void Calculate_matches_the_documented_examples(
        decimal quantity,
        decimal netUnitPrice,
        int vatRatePercent,
        decimal expectedNet,
        decimal expectedVat,
        decimal expectedGross)
    {
        var amounts = QuoteLineCalculator.Calculate(quantity, netUnitPrice, vatRatePercent);

        Assert.Equal(new QuoteLineAmounts(expectedNet, expectedVat, expectedGross), amounts);
    }
}
