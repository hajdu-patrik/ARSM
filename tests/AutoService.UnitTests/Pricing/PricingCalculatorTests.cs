using AutoService.ApiService.Pricing;

namespace AutoService.UnitTests.Pricing;

/** The display-only gross unit price the catalog DTOs carry (the WebUI live preview mirrors it). */
public sealed class PricingCalculatorTests
{
    [Theory]
    [InlineData(4500.00, 27, 5715.00)]
    [InlineData(5000.00, 18, 5900.00)]
    [InlineData(10.10, 5, 10.61)]
    [InlineData(0, 27, 0)]
    [InlineData(0.01, 5, 0.01)]
    [InlineData(0.03, 27, 0.04)]
    public void GrossUnitPrice_matches_the_catalog_suite_examples(decimal net, int vatRatePercent, decimal expectedGross)
    {
        Assert.Equal(expectedGross, PricingCalculator.GrossUnitPrice(net, vatRatePercent));
    }
}
