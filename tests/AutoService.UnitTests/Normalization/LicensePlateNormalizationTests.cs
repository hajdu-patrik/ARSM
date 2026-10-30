using AutoService.ApiService.Normalization;

namespace AutoService.UnitTests.Normalization;

/** Plate normalization: upper-case, collapsed spaces, European scripts, and one stable message per rule. */
public sealed class LicensePlateNormalizationTests
{
    private static string Error(string raw)
    {
        Assert.False(LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(raw, out var plate, out var error));
        Assert.Equal(string.Empty, plate);
        return error;
    }

    [Theory]
    [InlineData("abc-123", "ABC-123")]
    [InlineData("  AB   123 ", "AB 123")]
    [InlineData("AB\t12", "AB 12")]
    [InlineData("áb-123", "ÁB-123")]
    [InlineData("ΑΒΓ 123", "ΑΒΓ 123")]
    [InlineData("ав 1234", "АВ 1234")]
    [InlineData("AB.12", "AB.12")]
    [InlineData("M 1", "M 1")]
    public void Accepts_and_normalizes_valid_plates(string raw, string expected)
    {
        Assert.True(LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(raw, out var plate, out var error));
        Assert.Equal(expected, plate);
        Assert.Equal(string.Empty, error);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("A")]
    [InlineData("123456789012345678901")]
    public void Rejects_a_trimmed_length_outside_2_to_20(string raw)
    {
        Assert.Equal("License plate must be between 2 and 20 characters.", Error(raw));
    }

    [Fact]
    public void Accepts_exactly_20_characters()
    {
        Assert.True(LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(new string('1', 20), out var plate, out _));
        Assert.Equal(20, plate.Length);
    }

    [Theory]
    [InlineData("AB#123")]
    [InlineData("AB_123")]
    [InlineData("AB/123")]
    [InlineData("AB@12")]
    public void Rejects_unsupported_characters(string raw)
    {
        Assert.StartsWith("License plate contains unsupported characters.", Error(raw));
    }

    [Theory]
    [InlineData("AB漢1")]
    [InlineData("ABع1")]
    public void Rejects_letters_of_non_european_scripts(string raw)
    {
        Assert.Equal(
            "License plate contains non-European letters. Supported scripts are Latin, Greek, and Cyrillic.",
            Error(raw));
    }

    [Theory]
    [InlineData("-AB123")]
    [InlineData("AB123-")]
    [InlineData(".AB123")]
    public void Rejects_a_plate_that_does_not_start_and_end_with_a_letter_or_digit(string raw)
    {
        Assert.Equal("License plate must start and end with a letter or digit.", Error(raw));
    }

    [Theory]
    [InlineData("AB--123")]
    [InlineData("AB- 123")]
    [InlineData("AB..12")]
    public void Rejects_repeated_separators(string raw)
    {
        Assert.Equal("License plate cannot contain repeated separators.", Error(raw));
    }

    [Theory]
    [InlineData("ABC-DEF")]
    [InlineData("AB CD")]
    public void Requires_at_least_one_digit(string raw)
    {
        Assert.Equal("License plate must contain at least one digit.", Error(raw));
    }
}
