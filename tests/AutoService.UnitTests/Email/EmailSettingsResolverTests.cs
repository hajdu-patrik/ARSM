using AutoService.ApiService.Email.Sending;
using Microsoft.Extensions.Configuration;

namespace AutoService.UnitTests.Email;

/** The Email section is optional without an endpoint and strict once an endpoint is set. */
public sealed class EmailSettingsResolverTests
{
    private const string Endpoint = "https://arsm-mail.europe.communication.azure.com";
    private const string ClientId = "11111111-2222-3333-4444-555555555555";

    private static IConfiguration Config(IEnumerable<KeyValuePair<string, string?>> values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(v => new KeyValuePair<string, string?>($"Email:{v.Key}", v.Value)))
            .Build();

    private static Dictionary<string, string?> FullValues() => new()
    {
        ["Endpoint"] = Endpoint,
        ["ManagedIdentityClientId"] = ClientId,
        ["From"] = "info@arsm.hu",
        ["ReplyTo"] = "info@arsm.hu",
        ["PublicUrl"] = "https://arsm.hu",
    };

    [Fact]
    public void Resolve_with_a_blank_endpoint_is_not_configured_and_does_not_throw()
    {
        var settings = EmailSettingsResolver.Resolve(Config(new Dictionary<string, string?> { ["Endpoint"] = "  " }));

        Assert.False(settings.IsConfigured);
        Assert.Null(settings.Endpoint);
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
    public void Resolve_with_an_endpoint_returns_the_trimmed_values()
    {
        var values = FullValues();
        values["Endpoint"] = $" {Endpoint} ";

        var settings = EmailSettingsResolver.Resolve(Config(values));

        Assert.True(settings.IsConfigured);
        Assert.Equal(Endpoint, settings.Endpoint);
        Assert.Equal(ClientId, settings.ManagedIdentityClientId);
        Assert.Equal("info@arsm.hu", settings.From);
        Assert.Equal("info@arsm.hu", settings.ReplyTo);
        Assert.Equal("https://arsm.hu", settings.PublicUrl);
    }

    [Theory]
    [InlineData("http://arsm-mail.europe.communication.azure.com")]
    [InlineData("arsm-mail.europe.communication.azure.com")]
    public void Resolve_with_a_non_https_endpoint_throws(string endpoint)
    {
        var values = FullValues();
        values["Endpoint"] = endpoint;

        var exception = Assert.Throws<InvalidOperationException>(() => EmailSettingsResolver.Resolve(Config(values)));

        Assert.Contains("Email:Endpoint", exception.Message);
    }

    [Fact]
    public void Resolve_with_a_non_guid_client_id_throws()
    {
        var values = FullValues();
        values["ManagedIdentityClientId"] = "arsm-pull-identity";

        var exception = Assert.Throws<InvalidOperationException>(() => EmailSettingsResolver.Resolve(Config(values)));

        Assert.Contains("Email:ManagedIdentityClientId", exception.Message);
    }

    [Theory]
    [InlineData("ARSM <info@arsm.hu>")]
    [InlineData("info@arsm.hu, other@arsm.hu")]
    public void Resolve_with_a_from_that_is_not_one_plain_address_throws(string from)
    {
        var values = FullValues();
        values["From"] = from;

        var exception = Assert.Throws<InvalidOperationException>(() => EmailSettingsResolver.Resolve(Config(values)));

        Assert.Contains("Email:From", exception.Message);
    }

    [Theory]
    [InlineData("Endpoint", "https://CHANGE_ME.communication.azure.com")]
    [InlineData("From", "CHANGE_ME@arsm.hu")]
    public void Resolve_with_a_template_marker_throws(string key, string value)
    {
        var values = FullValues();
        values[key] = value;

        var exception = Assert.Throws<InvalidOperationException>(() => EmailSettingsResolver.Resolve(Config(values)));

        Assert.Contains($"Email:{key}", exception.Message);
    }

    [Theory]
    [InlineData("ManagedIdentityClientId")]
    [InlineData("From")]
    [InlineData("ReplyTo")]
    [InlineData("PublicUrl")]
    public void Resolve_with_an_endpoint_and_a_missing_value_throws(string missing)
    {
        var values = FullValues();
        values.Remove(missing);

        var exception = Assert.Throws<InvalidOperationException>(() => EmailSettingsResolver.Resolve(Config(values)));

        Assert.Contains($"Email:{missing}", exception.Message);
    }
}
