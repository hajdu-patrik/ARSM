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
        // net 10.004 -> 10.00; VAT 5 % of 10.00 -> 0.50; a 1.05 multiplication of 10.004 would give 10.50 from a different base.
        var amounts = QuoteLineCalculator.Calculate(quantity: 1m, netUnitPrice: 10.004m, vatRatePercent: 5);

        Assert.Equal(10.00m, amounts.NetAmount);
        Assert.Equal(0.50m, amounts.VatAmount);
        Assert.Equal(amounts.NetAmount + amounts.VatAmount, amounts.GrossAmount);
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
