using AutoService.ApiService.Configuration;

namespace AutoService.UnitTests.Configuration;

/** The detector flags CHANGE_ME / SET_UNIQUE_LOCAL however the placeholder was punctuated or cased. */
public sealed class TemplateMarkerDetectorTests
{
    [Theory]
    [InlineData("CHANGE_ME")]
    [InlineData("change_me")]
    [InlineData("prefix-CHANGE_ME-suffix")]
    [InlineData("SET_UNIQUE_LOCAL")]
    [InlineData("set_unique_local_secret")]
    [InlineData("Change-Me")]
    [InlineData("change me")]
    [InlineData("CHANGEME")]
    [InlineData("set unique local")]
    [InlineData("S-E-T U.N.I.Q.U.E L_O_C_A_L")]
    public void A_placeholder_marker_is_detected(string value)
    {
        Assert.True(TemplateMarkerDetector.ContainsTemplateMarker(value));
    }

    [Theory]
    [InlineData("")]
    [InlineData("a-real-secret-value-123")]
    [InlineData("Host=db;Database=app;Username=app")]
    [InlineData("chang")]
    [InlineData("set unique")]
    public void A_real_value_is_not_flagged(string value)
    {
        Assert.False(TemplateMarkerDetector.ContainsTemplateMarker(value));
    }
}
