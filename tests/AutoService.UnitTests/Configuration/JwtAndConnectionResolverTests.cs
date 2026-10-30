using AutoService.ApiService.Configuration;
using Microsoft.Extensions.Configuration;

namespace AutoService.UnitTests.Configuration;

/** JWT secret, token lifetime and connection string: environment over config, fail fast on bad values. */
[Collection(ProcessEnvironmentCollection.Name)]
public sealed class JwtAndConnectionResolverTests : IDisposable
{
    private const string SecretVariable = "JwtSettings__Secret";
    private const string ConnectionVariable = "ConnectionStrings__AutoServiceDb";

    private readonly ProcessEnvironmentScope environment = new(SecretVariable, ConnectionVariable);

    public void Dispose() => environment.Dispose();

    private static IConfiguration Config(params (string Key, string? Value)[] values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(pair => new KeyValuePair<string, string?>(pair.Key, pair.Value)))
            .Build();

    private static readonly string ValidSecret = new('s', 40);

    [Fact]
    public void The_secret_comes_from_configuration()
    {
        Assert.Equal(ValidSecret, JwtSettingsResolver.ResolveSecret(Config(("JwtSettings:Secret", ValidSecret))));
    }

    [Fact]
    public void A_non_blank_environment_secret_wins_over_configuration()
    {
        var fromEnvironment = new string('e', 40);
        environment.Set(SecretVariable, fromEnvironment);

        Assert.Equal(fromEnvironment, JwtSettingsResolver.ResolveSecret(Config(("JwtSettings:Secret", ValidSecret))));
    }

    [Fact]
    public void A_blank_environment_secret_falls_back_to_configuration()
    {
        environment.Set(SecretVariable, "   ");

        Assert.Equal(ValidSecret, JwtSettingsResolver.ResolveSecret(Config(("JwtSettings:Secret", ValidSecret))));
    }

    [Fact]
    public void A_bad_environment_secret_is_not_rescued_by_a_good_configured_one()
    {
        environment.Set(SecretVariable, "too-short");

        Assert.Throws<InvalidOperationException>(() => JwtSettingsResolver.ResolveSecret(Config(("JwtSettings:Secret", ValidSecret))));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void A_missing_secret_fails_startup(string? secret)
    {
        var exception = Assert.Throws<InvalidOperationException>(() => JwtSettingsResolver.ResolveSecret(Config(("JwtSettings:Secret", secret))));

        Assert.Contains("is missing", exception.Message);
    }

    [Theory]
    [InlineData("CHANGE_ME_CHANGE_ME_CHANGE_ME_CHANGE_ME")]
    [InlineData("set-unique-local-secret-set-unique-local")]
    [InlineData("Change Me Change Me Change Me Change Me")]
    public void A_placeholder_secret_fails_startup_even_when_long_enough(string secret)
    {
        var exception = Assert.Throws<InvalidOperationException>(() => JwtSettingsResolver.ResolveSecret(Config(("JwtSettings:Secret", secret))));

        Assert.Contains("template placeholder marker", exception.Message);
    }

    [Fact]
    public void The_secret_must_be_at_least_32_bytes_not_32_characters()
    {
        Assert.Throws<InvalidOperationException>(() => JwtSettingsResolver.ResolveSecret(Config(("JwtSettings:Secret", new string('s', 31)))));
        Assert.Equal(new string('s', 32), JwtSettingsResolver.ResolveSecret(Config(("JwtSettings:Secret", new string('s', 32)))));

        var sixteenTwoByteCharacters = new string('é', 16);
        Assert.Equal(sixteenTwoByteCharacters, JwtSettingsResolver.ResolveSecret(Config(("JwtSettings:Secret", sixteenTwoByteCharacters))));
    }

    [Theory]
    [InlineData(null, 10)]
    [InlineData("", 10)]
    [InlineData("   ", 10)]
    [InlineData("1", 1)]
    [InlineData("15", 15)]
    [InlineData(" 20 ", 20)]
    public void The_token_lifetime_defaults_to_ten_minutes_and_otherwise_takes_the_positive_integer(string? value, int expected)
    {
        Assert.Equal(expected, JwtSettingsResolver.ResolveExpirationMinutes(Config(("JwtSettings:ExpirationMinutes", value))));
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-5")]
    [InlineData("abc")]
    [InlineData("1.5")]
    [InlineData("99999999999")]
    public void An_invalid_token_lifetime_fails_startup(string value)
    {
        Assert.Throws<InvalidOperationException>(() => JwtSettingsResolver.ResolveExpirationMinutes(Config(("JwtSettings:ExpirationMinutes", value))));
    }

    [Fact]
    public void The_connection_string_comes_from_configuration()
    {
        Assert.Equal("Host=db;Database=app", ConnectionStringResolver.Resolve(Config(("ConnectionStrings:AutoServiceDb", "Host=db;Database=app"))));
    }

    [Fact]
    public void A_non_blank_environment_connection_string_wins_and_a_blank_one_falls_back()
    {
        var configuration = Config(("ConnectionStrings:AutoServiceDb", "Host=config;Database=app"));
        environment.Set(ConnectionVariable, "Host=env;Database=app");
        Assert.Equal("Host=env;Database=app", ConnectionStringResolver.Resolve(configuration));

        environment.Set(ConnectionVariable, " ");
        Assert.Equal("Host=config;Database=app", ConnectionStringResolver.Resolve(configuration));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void A_missing_connection_string_fails_startup_naming_the_remedy(string? value)
    {
        var exception = Assert.Throws<InvalidOperationException>(
            () => ConnectionStringResolver.Resolve(Config(("ConnectionStrings:AutoServiceDb", value))));

        Assert.Contains("ConnectionStrings__AutoServiceDb", exception.Message);
    }

    [Fact]
    public void A_placeholder_connection_string_fails_startup_without_echoing_it()
    {
        const string value = "Host=db;Password=CHANGE_ME";

        var exception = Assert.Throws<InvalidOperationException>(
            () => ConnectionStringResolver.Resolve(Config(("ConnectionStrings:AutoServiceDb", value))));

        Assert.Contains("template placeholder marker", exception.Message);
        Assert.DoesNotContain(value, exception.Message);
    }
}
