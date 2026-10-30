using AutoService.ApiService.Normalization;

namespace AutoService.UnitTests.Normalization;

/** VIN structure (17 chars, no I/O/Q) and the UTC rule for request dates. */
public sealed class VinAndDateNormalizationTests
{
    [Theory]
    [InlineData("WVWZZZAUZJW123456", "WVWZZZAUZJW123456")]
    [InlineData("  wvwzzzauzjw123456  ", "WVWZZZAUZJW123456")]
    [InlineData("1HGCM82633A004352", "1HGCM82633A004352")]
    public void TryNormalizeVin_trims_and_upper_cases_a_valid_vin(string raw, string expected)
    {
        Assert.True(VinNormalization.TryNormalizeVin(raw, out var vin, out var error));
        Assert.Equal(expected, vin);
        Assert.Equal(string.Empty, error);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("    ")]
    public void TryNormalizeVin_requires_a_value(string? raw)
    {
        Assert.False(VinNormalization.TryNormalizeVin(raw, out var vin, out var error));
        Assert.Equal(string.Empty, vin);
        Assert.Equal("VIN is required.", error);
    }

    [Theory]
    [InlineData("WVWZZZAUZJW12345")]
    [InlineData("WVWZZZAUZJW1234567")]
    public void TryNormalizeVin_requires_exactly_17_characters(string raw)
    {
        Assert.False(VinNormalization.TryNormalizeVin(raw, out _, out var error));
        Assert.Equal("VIN must be exactly 17 characters.", error);
    }

    [Theory]
    [InlineData("WVWZZZAUZJW12345I")]
    [InlineData("WVWZZZAUZJW12345O")]
    [InlineData("WVWZZZAUZJW12345q")]
    [InlineData("WVWZZZAUZJW12345-")]
    [InlineData("WVWZZZAUZJW12345ő")]
    public void TryNormalizeVin_rejects_forbidden_letters_and_symbols(string raw)
    {
        Assert.False(VinNormalization.TryNormalizeVin(raw, out _, out var error));
        Assert.Equal("VIN may only contain digits and uppercase letters A-H, J-N, P, and R-Z.", error);
    }

    [Fact]
    public void ToUtc_keeps_a_utc_value_unchanged()
    {
        var value = new DateTime(2026, 10, 30, 8, 15, 0, DateTimeKind.Utc);

        var result = DateTimeNormalization.ToUtc(value);

        Assert.Equal(value, result);
        Assert.Equal(DateTimeKind.Utc, result.Kind);
    }

    [Fact]
    public void ToUtc_converts_a_local_value_to_universal_time()
    {
        var local = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Local);

        var result = DateTimeNormalization.ToUtc(local);

        Assert.Equal(local.ToUniversalTime(), result);
        Assert.Equal(DateTimeKind.Utc, result.Kind);
    }

    [Fact]
    public void ToUtc_treats_an_unspecified_value_as_already_utc()
    {
        var unspecified = new DateTime(2026, 10, 30, 8, 15, 0, DateTimeKind.Unspecified);

        var result = DateTimeNormalization.ToUtc(unspecified);

        Assert.Equal(unspecified.Ticks, result.Ticks);
        Assert.Equal(DateTimeKind.Utc, result.Kind);
    }
}
