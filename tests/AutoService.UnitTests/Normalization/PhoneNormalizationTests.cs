using AutoService.ApiService.Normalization;

namespace AutoService.UnitTests.Normalization;

/** European phone numbers become E.164; valid non-European, malformed and blank input is refused. */
public sealed class PhoneNormalizationTests
{
    [Theory]
    [InlineData("+36 20 123 4567", "+36201234567")]
    [InlineData("06 20 123 4567", "+36201234567")]
    [InlineData("20 123 4567", "+36201234567")]
    [InlineData("  +36201234567  ", "+36201234567")]
    [InlineData("+49 151 23456789", "+4915123456789")]
    [InlineData("+44 7400 123456", "+447400123456")]
    public void TryNormalizeEuPhoneNumber_formats_valid_european_numbers_as_e164(string raw, string expected)
    {
        Assert.True(ContactNormalization.TryNormalizeEuPhoneNumber(raw, out var e164));
        Assert.Equal(expected, e164);
    }

    [Fact]
    public void TryNormalizeEuPhoneNumber_uses_the_given_default_region_for_national_numbers()
    {
        Assert.True(ContactNormalization.TryNormalizeEuPhoneNumber("0151 23456789", out var e164, "DE"));
        Assert.Equal("+4915123456789", e164);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("abc")]
    [InlineData("12")]
    [InlineData("+36 20 123")]
    public void TryNormalizeEuPhoneNumber_rejects_blank_unparsable_and_invalid_numbers(string? raw)
    {
        Assert.False(ContactNormalization.TryNormalizeEuPhoneNumber(raw, out var e164));
        Assert.Equal(string.Empty, e164);
    }

    [Fact]
    public void TryNormalizeEuPhoneNumber_rejects_a_valid_number_outside_europe()
    {
        Assert.False(ContactNormalization.TryNormalizeEuPhoneNumber("+1 650 253 0000", out var e164));
        Assert.Equal(string.Empty, e164);
    }

    [Fact]
    public void BuildPhoneLookupCandidates_returns_the_e164_and_the_legacy_no_plus_form()
    {
        Assert.Equal(
            new[] { "+36201234567", "36201234567" },
            ContactNormalization.BuildPhoneLookupCandidates("+36201234567"));
    }
}
