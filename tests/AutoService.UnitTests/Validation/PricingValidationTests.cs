using System.Globalization;
using AutoService.ApiService.Validation;

namespace AutoService.UnitTests.Validation;

/** VAT set 5/18/27, the money range 0..100,000,000 and the quantity range (0, 10,000]. */
public sealed class PricingValidationTests
{
    private static decimal D(string value) => decimal.Parse(value, CultureInfo.InvariantCulture);

    [Theory]
    [InlineData(5)]
    [InlineData(18)]
    [InlineData(27)]
    public void GetVatRateValidationError_accepts_the_three_hungarian_rates(int rate)
    {
        Assert.Null(PricingValidation.GetVatRateValidationError(rate));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(4)]
    [InlineData(19)]
    [InlineData(28)]
    [InlineData(-27)]
    public void GetVatRateValidationError_rejects_any_other_rate(int rate)
    {
        Assert.Equal(ValidationMessages.InvalidVatRate, PricingValidation.GetVatRateValidationError(rate));
    }

    [Theory]
    [InlineData("0")]
    [InlineData("0.01")]
    [InlineData("100000000")]
    public void GetMoneyAmountValidationError_accepts_the_inclusive_range(string amount)
    {
        Assert.Null(PricingValidation.GetMoneyAmountValidationError(D(amount)));
    }

    [Theory]
    [InlineData("-0.01")]
    [InlineData("100000000.01")]
    public void GetMoneyAmountValidationError_rejects_amounts_outside_the_range(string amount)
    {
        Assert.Equal(ValidationMessages.InvalidMoneyAmount, PricingValidation.GetMoneyAmountValidationError(D(amount)));
    }

    [Theory]
    [InlineData("0.005")]
    [InlineData("0.01")]
    [InlineData("0.25")]
    [InlineData("10000")]
    public void GetQuantityValidationError_accepts_positive_quantities_up_to_the_cap(string quantity)
    {
        Assert.Null(PricingValidation.GetQuantityValidationError(D(quantity)));
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("0.004")]
    [InlineData("10000.01")]
    public void GetQuantityValidationError_rejects_zero_negative_and_oversized_quantities(string quantity)
    {
        Assert.Equal(ValidationMessages.InvalidQuantity, PricingValidation.GetQuantityValidationError(D(quantity)));
    }

    [Fact]
    public void Limits_are_the_documented_constants()
    {
        Assert.Equal(0m, PricingValidation.MinMoneyAmount);
        Assert.Equal(100_000_000m, PricingValidation.MaxMoneyAmount);
        Assert.Equal(10_000m, PricingValidation.MaxQuantity);
    }
}
