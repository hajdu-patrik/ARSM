using AutoService.ApiService.Email.Sending;
using Microsoft.Extensions.Configuration;

namespace AutoService.UnitTests.Email;

/** The Email section is optional without a key and strict once a key is set. */
public sealed class EmailSettingsResolverTests
{
    private static IConfiguration Config(IEnumerable<KeyValuePair<string, string?>> values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(v => new KeyValuePair<string, string?>($"Email:{v.Key}", v.Value)))
            .Build();

    private static Dictionary<string, string?> FullValues() => new()
    {
        ["ResendApiKey"] = "re_real",
        ["From"] = "ARSM <info@arsm.hu>",
        ["ReplyTo"] = "info@arsm.hu",
        ["PublicUrl"] = "https://arsm.hu",
    };

    [Fact]
    public void Resolve_with_a_blank_key_is_not_configured_and_does_not_throw()
    {
        var settings = EmailSettingsResolver.Resolve(Config(new Dictionary<string, string?> { ["ResendApiKey"] = "  " }));

        Assert.False(settings.IsConfigured);
        Assert.Equal(string.Empty, settings.From);
        Assert.Equal(string.Empty, settings.ReplyTo);
        Assert.Equal(string.Empty, settings.PublicUrl);
    }

    [Fact]
    public void Resolve_with_no_section_is_not_configured()
    {
        Assert.False(EmailSettingsResolver.Resolve(Config(new Dictionary<string, string?>())).IsConfigured);
    }

    [Fact]
    public void Resolve_with_a_key_returns_the_trimmed_values()
    {
        var values = FullValues();
        values["ResendApiKey"] = " re_real ";

        var settings = EmailSettingsResolver.Resolve(Config(values));

        Assert.True(settings.IsConfigured);
        Assert.Equal("re_real", settings.ResendApiKey);
        Assert.Equal("ARSM <info@arsm.hu>", settings.From);
        Assert.Equal("info@arsm.hu", settings.ReplyTo);
        Assert.Equal("https://arsm.hu", settings.PublicUrl);
    }

    [Fact]
    public void Resolve_with_a_template_marker_from_throws()
    {
        var values = FullValues();
        values["From"] = "ARSM <CHANGE_ME@arsm.hu>";

        var exception = Assert.Throws<InvalidOperationException>(() => EmailSettingsResolver.Resolve(Config(values)));

        Assert.Contains("Email:From", exception.Message);
        Assert.DoesNotContain("re_real", exception.Message);
    }

    [Fact]
    public void Resolve_with_a_template_marker_key_throws()
    {
        var values = FullValues();
        values["ResendApiKey"] = "SET_UNIQUE_LOCAL_key";

        Assert.Throws<InvalidOperationException>(() => EmailSettingsResolver.Resolve(Config(values)));
    }

    [Theory]
    [InlineData("From")]
    [InlineData("ReplyTo")]
    [InlineData("PublicUrl")]
    public void Resolve_with_a_key_and_a_missing_value_throws(string missing)
    {
        var values = FullValues();
        values.Remove(missing);

        var exception = Assert.Throws<InvalidOperationException>(() => EmailSettingsResolver.Resolve(Config(values)));

        Assert.Contains($"Email:{missing}", exception.Message);
    }
}
