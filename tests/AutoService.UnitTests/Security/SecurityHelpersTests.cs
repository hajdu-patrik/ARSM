using System.Net;
using System.Security.Claims;
using AutoService.ApiService.Security;
using AutoService.UnitTests.Configuration;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace AutoService.UnitTests.Security;

/** The small pure helpers of the Security folder: address hashing, token hashing and claim parsing, topology guard. */
public sealed class SecurityHelpersTests
{
    private static HttpContext ContextFor(IPAddress? ip) => new DefaultHttpContext { Connection = { RemoteIpAddress = ip } };

    [Fact]
    public void The_client_hash_is_sha256_prefixed_and_twelve_hex_characters_long()
    {
        var hash = ClientIpAddress.Hash(ContextFor(IPAddress.Parse("203.0.113.9")));

        Assert.Matches("^sha256:[0-9A-F]{12}$", hash);
        Assert.DoesNotContain("203.0.113.9", hash);
    }

    [Fact]
    public void The_client_hash_is_stable_per_address_and_differs_between_addresses()
    {
        var first = ClientIpAddress.Hash(ContextFor(IPAddress.Parse("203.0.113.9")));

        Assert.Equal(first, ClientIpAddress.Hash(ContextFor(IPAddress.Parse("203.0.113.9"))));
        Assert.NotEqual(first, ClientIpAddress.Hash(ContextFor(IPAddress.Parse("203.0.113.10"))));
    }

    [Fact]
    public void Without_a_remote_address_there_is_no_hash()
    {
        Assert.Null(ClientIpAddress.Hash(ContextFor(null)));
    }

    [Fact]
    public void Sha256_is_the_upper_case_hex_of_the_utf8_bytes()
    {
        Assert.Equal("BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD", TokenSecurity.HashSha256("abc"));
        Assert.Equal("E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855", TokenSecurity.HashSha256(string.Empty));
    }

    [Fact]
    public void Expiry_and_issue_time_are_read_from_unix_second_claims()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity([new Claim("exp", "1800000000"), new Claim("iat", "1799999400")], "test"));

        Assert.Equal(DateTimeOffset.FromUnixTimeSeconds(1800000000), TokenSecurity.ParseJwtExpiry(principal));
        Assert.Equal(DateTimeOffset.FromUnixTimeSeconds(1799999400), TokenSecurity.ParseJwtIssuedAt(principal));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("tomorrow")]
    [InlineData("1.5")]
    public void A_missing_or_non_numeric_time_claim_parses_to_null(string? value)
    {
        var claims = value is null ? [] : new List<Claim> { new("exp", value), new("iat", value) };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));

        Assert.Null(TokenSecurity.ParseJwtExpiry(principal));
        Assert.Null(TokenSecurity.ParseJwtIssuedAt(principal));
    }

    private static IConfiguration Topology(string? value) => new ConfigurationBuilder()
        .AddInMemoryCollection(value is null ? [] : [new KeyValuePair<string, string?>("Deployment:RateLimiterTopology", value)])
        .Build();

    [Fact]
    public void Development_needs_no_topology_setting()
    {
        InProcessLimiterTopologyGuard.Validate(Topology(null), FakeHostEnvironment.Development);
    }

    [Theory]
    [InlineData("SingleInstance")]
    [InlineData("singleinstance")]
    [InlineData("SINGLEINSTANCE")]
    public void A_hosted_environment_passes_only_with_the_single_instance_confirmation(string value)
    {
        InProcessLimiterTopologyGuard.Validate(Topology(value), FakeHostEnvironment.Production);
        InProcessLimiterTopologyGuard.Validate(Topology(value), new FakeHostEnvironment(Environments.Staging));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("MultiInstance")]
    [InlineData("Single Instance")]
    public void A_hosted_environment_without_the_confirmation_fails_startup(string? value)
    {
        var exception = Assert.Throws<InvalidOperationException>(
            () => InProcessLimiterTopologyGuard.Validate(Topology(value), FakeHostEnvironment.Production));

        Assert.Contains("Deployment:RateLimiterTopology=SingleInstance", exception.Message);
    }
}
