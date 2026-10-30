using AutoService.ApiService.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace AutoService.UnitTests.Configuration;

/** The CORS/Origin allow-list: strict explicit origins, stricter outside Development, normalized for comparison. */
public sealed class WebUiOriginPolicyTests
{
    private static WebUiOriginPolicy Create(string environment, params string?[] origins) => WebUiOriginPolicy.Create(
        new ConfigurationBuilder()
            .AddInMemoryCollection(origins.Select((origin, index) => new KeyValuePair<string, string?>($"Cors:AllowedOrigins:{index}", origin)))
            .Build(),
        new FakeHostEnvironment(environment));

    private static string Fail(string environment, params string?[] origins) =>
        Assert.Throws<InvalidOperationException>(() => Create(environment, origins)).Message;

    [Fact]
    public void No_origins_at_all_fails_startup()
    {
        var message = Assert.Throws<InvalidOperationException>(() => WebUiOriginPolicy.Create(
            new ConfigurationBuilder().Build(), FakeHostEnvironment.Production)).Message;

        Assert.Contains("Cors:AllowedOrigins", message);
    }

    [Fact]
    public void Only_blank_origins_count_as_none()
    {
        Assert.Contains("Cors:AllowedOrigins", Fail(Environments.Production, "", "   "));
    }

    [Theory]
    [InlineData("*")]
    [InlineData("https://*.example.test")]
    [InlineData("null")]
    [InlineData("NULL")]
    public void Wildcard_and_null_origins_are_refused(string origin)
    {
        Assert.Contains("not wildcard or null", Fail(Environments.Development, origin));
    }

    [Theory]
    [InlineData("app.example.test")]
    [InlineData("ftp://app.example.test")]
    [InlineData("localhost:5173")]
    [InlineData("/relative")]
    public void Anything_but_an_absolute_http_or_https_url_is_refused(string origin)
    {
        Assert.Contains("absolute HTTP(S) origin", Fail(Environments.Development, origin));
    }

    [Theory]
    [InlineData("https://app.example.test/app")]
    [InlineData("https://app.example.test/?x=1")]
    [InlineData("https://app.example.test/#top")]
    public void A_path_query_or_fragment_is_refused(string origin)
    {
        Assert.Contains("path, query, or fragment", Fail(Environments.Production, origin));
    }

    [Theory]
    [InlineData("http://app.example.test")]
    [InlineData("https://localhost")]
    [InlineData("https://LOCALHOST:5173")]
    [InlineData("https://127.0.0.1")]
    public void Outside_development_only_https_and_a_non_loopback_host_pass(string origin)
    {
        Assert.Contains("not safe for non-Development", Fail(Environments.Production, origin));
        Assert.Contains("not safe for non-Development", Fail(Environments.Staging, origin));
    }

    [Theory]
    [InlineData("http://localhost:5173")]
    [InlineData("https://127.0.0.1:7443")]
    [InlineData("http://app.example.test")]
    public void Development_accepts_http_and_loopback_origins(string origin)
    {
        var policy = Create(Environments.Development, origin);

        Assert.True(policy.Allows(origin));
    }

    [Theory]
    [InlineData("HTTPS://App.Example.Test", "https://app.example.test")]
    [InlineData("https://app.example.test/", "https://app.example.test")]
    [InlineData("https://app.example.test:443", "https://app.example.test")]
    [InlineData("  https://app.example.test  ", "https://app.example.test")]
    [InlineData("https://app.example.test:8443", "https://app.example.test:8443")]
    [InlineData("http://app.example.test:80", "http://app.example.test")]
    public void Origins_are_normalized_to_scheme_host_and_a_non_default_port(string configured, string expected)
    {
        var origin = Assert.Single(Create(Environments.Development, configured).AllowedOrigins);

        Assert.Equal(expected, origin);
    }

    [Fact]
    public void Duplicates_that_normalize_alike_collapse_to_one()
    {
        var policy = Create(Environments.Production, "https://app.example.test", "HTTPS://APP.EXAMPLE.TEST/", "https://app.example.test:443", "", "https://other.example.test");

        Assert.Equal(new[] { "https://app.example.test", "https://other.example.test" }, policy.AllowedOrigins);
    }

    [Fact]
    public void Allows_matches_exactly_ignoring_case_and_surrounding_space()
    {
        var policy = Create(Environments.Production, "https://app.example.test");

        Assert.True(policy.Allows("https://app.example.test"));
        Assert.True(policy.Allows("HTTPS://APP.EXAMPLE.TEST"));
        Assert.True(policy.Allows("  https://app.example.test "));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("https://evil.example.test")]
    [InlineData("http://app.example.test")]
    [InlineData("https://app.example.test:8443")]
    [InlineData("https://sub.app.example.test")]
    [InlineData("null")]
    public void Allows_refuses_blank_and_every_other_origin(string? origin)
    {
        Assert.False(Create(Environments.Production, "https://app.example.test").Allows(origin));
    }
}
