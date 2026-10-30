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

    [Theory]
    [InlineData(1.5, 10.10, 27)]
    [InlineData(0.25, 999.99, 18)]
    [InlineData(10000, 100000000, 27)]
    [InlineData(3, 0.01, 5)]
    public void Calculate_keeps_gross_equal_to_net_plus_vat(decimal quantity, decimal netUnitPrice, int vatRatePercent)
    {
        var amounts = QuoteLineCalculator.Calculate(quantity, netUnitPrice, vatRatePercent);

        Assert.Equal(amounts.NetAmount + amounts.VatAmount, amounts.GrossAmount);
    }

    [Fact]
    public void Calculate_handles_the_largest_allowed_quantity_and_price_without_overflow()
    {
        var amounts = QuoteLineCalculator.Calculate(10_000m, 100_000_000m, 27);

        Assert.Equal(new QuoteLineAmounts(1_000_000_000_000m, 270_000_000_000m, 1_270_000_000_000m), amounts);
    }
}
