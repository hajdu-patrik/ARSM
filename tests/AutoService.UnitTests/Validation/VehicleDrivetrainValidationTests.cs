using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Validation;

namespace AutoService.UnitTests.Validation;

/** The drivetrain DTO string parses to the canonical enum by name only, never from a number. */
public sealed class VehicleDrivetrainValidationTests
{
    [Theory]
    [InlineData("Petrol", DrivetrainType.Petrol)]
    [InlineData("diesel", DrivetrainType.Diesel)]
    [InlineData("  HYBRID  ", DrivetrainType.Hybrid)]
    [InlineData("phev", DrivetrainType.PHEV)]
    [InlineData("Electric", DrivetrainType.Electric)]
    public void TryParse_accepts_every_name_case_insensitively_and_trimmed(string raw, DrivetrainType expected)
    {
        var parsed = VehicleDrivetrainValidation.TryParse(raw, out var type, out var error);

        Assert.True(parsed);
        Assert.Equal(expected, type);
        Assert.Equal(string.Empty, error);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void TryParse_reports_a_missing_value(string? raw)
    {
        var parsed = VehicleDrivetrainValidation.TryParse(raw, out _, out var error);

        Assert.False(parsed);
        Assert.Equal("DrivetrainType is required.", error);
    }

    [Theory]
    [InlineData("Gasoline")]
    [InlineData("0")]
    [InlineData("2")]
    [InlineData("Petrol,Diesel")]
    public void TryParse_rejects_unknown_names_and_numeric_enum_input(string raw)
    {
        var parsed = VehicleDrivetrainValidation.TryParse(raw, out _, out var error);

        Assert.False(parsed);
        Assert.Equal("DrivetrainType must be one of: Petrol, Diesel, Hybrid, PHEV, Electric.", error);
    }

    [Fact]
    public void TryParse_uses_the_caller_field_name_in_both_messages()
    {
        VehicleDrivetrainValidation.TryParse(null, out _, out var required, "Vehicle.DrivetrainType");
        VehicleDrivetrainValidation.TryParse("x", out _, out var unknown, "Vehicle.DrivetrainType");

        Assert.StartsWith("Vehicle.DrivetrainType is required", required);
        Assert.StartsWith("Vehicle.DrivetrainType must be one of", unknown);
    }
}
