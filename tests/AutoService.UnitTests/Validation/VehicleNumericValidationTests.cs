using AutoService.ApiService.Validation;

namespace AutoService.UnitTests.Validation;

/** Year range 1886..2100, non-negative mileage and power, and their upper caps. */
public sealed class VehicleNumericValidationTests
{
    [Theory]
    [InlineData(1886)]
    [InlineData(2026)]
    [InlineData(2100)]
    public void GetYearValidationError_accepts_the_inclusive_range(int year)
    {
        Assert.Null(VehicleNumericValidation.GetYearValidationError(year));
    }

    [Theory]
    [InlineData(1885, "")]
    [InlineData(2101, "")]
    [InlineData(0, "Vehicle.")]
    public void GetYearValidationError_rejects_years_outside_the_range_and_prefixes_the_field(int year, string prefix)
    {
        Assert.Equal(
            $"{prefix}Year must be between 1886 and 2100.",
            VehicleNumericValidation.GetYearValidationError(year, prefix));
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(1_000_000, 50_000)]
    [InlineData(120_000, 85)]
    public void GetValidationError_accepts_zero_and_the_caps(int mileageKm, int enginePowerKw)
    {
        Assert.Null(VehicleNumericValidation.GetValidationError(mileageKm, enginePowerKw));
    }

    [Theory]
    [InlineData(-1, 0)]
    [InlineData(0, -1)]
    [InlineData(-1, 60_000)]
    public void GetValidationError_rejects_negative_values_before_checking_the_caps(int mileageKm, int enginePowerKw)
    {
        Assert.Equal(
            "MileageKm and EnginePowerKw must be non-negative.",
            VehicleNumericValidation.GetValidationError(mileageKm, enginePowerKw));
    }

    [Theory]
    [InlineData(1_000_001, 0)]
    [InlineData(0, 50_001)]
    public void GetValidationError_rejects_values_above_the_caps(int mileageKm, int enginePowerKw)
    {
        Assert.Equal(
            "MileageKm must be <= 1000000 and EnginePowerKw must be <= 50000.",
            VehicleNumericValidation.GetValidationError(mileageKm, enginePowerKw));
    }

    [Fact]
    public void GetValidationError_prefixes_both_field_names()
    {
        Assert.Equal(
            "Vehicle.MileageKm and Vehicle.EnginePowerKw must be non-negative.",
            VehicleNumericValidation.GetValidationError(-5, 1, "Vehicle."));
        Assert.Equal(
            "Vehicle.MileageKm must be <= 1000000 and Vehicle.EnginePowerKw must be <= 50000.",
            VehicleNumericValidation.GetValidationError(2_000_000, 1, "Vehicle."));
    }
}
