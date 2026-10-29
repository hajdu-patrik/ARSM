using AutoService.ApiService.Security;
using Microsoft.Extensions.Configuration;

namespace AutoService.UnitTests.Security;

/** The warm-up timeout defaults to 15 seconds when absent and must be a positive whole number when present. */
public sealed class SessionRevocationSettingsResolverTests
{
    private static IConfiguration Config(string? value) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(value is null
                ? []
                : [new KeyValuePair<string, string?>("SessionRevocation:WarmupTimeoutSeconds", value)])
            .Build();

    [Fact]
    public void An_absent_timeout_defaults_to_15_seconds()
    {
        Assert.Equal(TimeSpan.FromSeconds(15), SessionRevocationSettingsResolver.ResolveWarmupTimeout(Config(null)));
    }

    [Theory]
    [InlineData("1", 1)]
    [InlineData("30", 30)]
    [InlineData(" 45 ", 45)]
    public void A_positive_whole_number_is_taken_as_seconds(string value, int expectedSeconds)
    {
        Assert.Equal(TimeSpan.FromSeconds(expectedSeconds), SessionRevocationSettingsResolver.ResolveWarmupTimeout(Config(value)));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("abc")]
    [InlineData("1.5")]
    [InlineData("0")]
    [InlineData("-5")]
    [InlineData("CHANGE_ME")]
    [InlineData("SET_UNIQUE_LOCAL_TIMEOUT")]
    public void An_invalid_value_fails_fast(string value)
    {
        var exception = Assert.Throws<InvalidOperationException>(
            () => SessionRevocationSettingsResolver.ResolveWarmupTimeout(Config(value)));

        Assert.Contains("SessionRevocation:WarmupTimeoutSeconds", exception.Message);
    }
}
