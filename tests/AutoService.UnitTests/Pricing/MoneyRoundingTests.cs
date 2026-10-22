using AutoService.ApiService.Pricing;

namespace AutoService.UnitTests.Pricing;

/** The one rounding rule of every amount: two decimals, midpoints away from zero (root CLAUDE.md Core Invariants). */
public sealed class MoneyRoundingTests
{
    [Theory]
    [InlineData(10.005, 10.01)]
    [InlineData(10.004, 10.00)]
    [InlineData(-10.005, -10.01)]
    [InlineData(0.125, 0.13)]
    [InlineData(1234.5, 1234.5)]
    public void RoundMoney_rounds_to_two_decimals_away_from_zero(decimal value, decimal expected)
    {
        Assert.Equal(expected, MoneyRounding.RoundMoney(value));
    }

    [Fact]
    public void RoundMoney_keeps_an_exact_amount()
    {
        Assert.Equal(4500.00m, MoneyRounding.RoundMoney(4500.00m));
    }
}
