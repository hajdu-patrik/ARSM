using System.Security.Claims;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace AutoService.UnitTests.Auth;

/** A signature-valid token still fails when its jti is denylisted or it predates the person's session cutoff. */
public sealed class AccessTokenValidationTests
{
    private static readonly DateTime Cutoff = new(2026, 1, 1, 0, 0, 10, DateTimeKind.Utc);

    private sealed class FakeDenylist : ITokenDenylistService
    {
        public bool Revoked { get; set; }

        public Exception? ThrowOnCheck { get; set; }

        public int Checks { get; private set; }

        public Task RevokeAsync(string jwtId, DateTimeOffset expiresAtUtc, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public Task<bool> IsRevokedAsync(string jwtId, CancellationToken cancellationToken = default)
        {
            Checks++;
            return ThrowOnCheck is null ? Task.FromResult(Revoked) : throw ThrowOnCheck;
        }
    }

    private static long Seconds(DateTime utc) => new DateTimeOffset(utc).ToUnixTimeSeconds();

    private static ClaimsPrincipal Principal(string? jti = "jti-1", string? personId = "5", long? issuedAt = null)
    {
        var claims = new List<Claim>();
        AddIfSet(claims, "jti", jti);
        AddIfSet(claims, PersonIdClaim.Type, personId);
        AddIfSet(claims, "iat", issuedAt?.ToString());
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
    }

    private static void AddIfSet(List<Claim> claims, string type, string? value)
    {
        if (value is not null)
        {
            claims.Add(new Claim(type, value));
        }
    }

    private static TokenValidatedContext Context(
        ClaimsPrincipal? principal, FakeDenylist denylist, ISessionRevocationService revocation, CancellationToken aborted = default)
    {
        var services = new ServiceCollection()
            .AddSingleton<ITokenDenylistService>(denylist)
            .AddSingleton(revocation)
            .BuildServiceProvider();
        var http = new DefaultHttpContext { RequestServices = services, RequestAborted = aborted };
        var scheme = new AuthenticationScheme("Bearer", null, typeof(JwtBearerHandler));

        return new TokenValidatedContext(http, scheme, new JwtBearerOptions()) { Principal = principal };
    }

    [Fact]
    public async Task A_token_that_is_neither_denylisted_nor_cut_off_is_left_alone()
    {
        var context = Context(Principal(issuedAt: Seconds(Cutoff)), new FakeDenylist(), new SessionRevocationService([]));

        await AccessTokenValidation.OnTokenValidatedAsync(context);

        Assert.Null(context.Result);
    }

    [Fact]
    public async Task A_missing_principal_is_a_no_op()
    {
        var denylist = new FakeDenylist { Revoked = true };
        var context = Context(null, denylist, new SessionRevocationService([]));

        await AccessTokenValidation.OnTokenValidatedAsync(context);

        Assert.Null(context.Result);
        Assert.Equal(0, denylist.Checks);
    }

    [Fact]
    public async Task A_denylisted_jti_fails_the_token_as_revoked()
    {
        var context = Context(Principal(), new FakeDenylist { Revoked = true }, new SessionRevocationService([]));

        await AccessTokenValidation.OnTokenValidatedAsync(context);

        Assert.Equal("Token has been revoked.", context.Result!.Failure!.Message);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public async Task A_token_without_a_jti_never_consults_the_denylist(string? jti)
    {
        var denylist = new FakeDenylist { Revoked = true };
        var context = Context(Principal(jti), denylist, new SessionRevocationService([]));

        await AccessTokenValidation.OnTokenValidatedAsync(context);

        Assert.Equal(0, denylist.Checks);
        Assert.Null(context.Result);
    }

    [Fact]
    public async Task A_token_issued_before_the_person_cutoff_fails_and_one_at_the_cutoff_passes()
    {
        var revocation = new SessionRevocationService([]);
        revocation.Seed(5, Cutoff);

        var before = Context(Principal(issuedAt: Seconds(Cutoff) - 1), new FakeDenylist(), revocation);
        var atCutoff = Context(Principal(issuedAt: Seconds(Cutoff)), new FakeDenylist(), revocation);
        await AccessTokenValidation.OnTokenValidatedAsync(before);
        await AccessTokenValidation.OnTokenValidatedAsync(atCutoff);

        Assert.Equal("Token was issued before the session was revoked.", before.Result!.Failure!.Message);
        Assert.Null(atCutoff.Result);
    }

    [Fact]
    public async Task A_cutoff_of_another_person_does_not_touch_the_token()
    {
        var revocation = new SessionRevocationService([]);
        revocation.Seed(6, Cutoff);
        var context = Context(Principal(personId: "5", issuedAt: Seconds(Cutoff) - 100), new FakeDenylist(), revocation);

        await AccessTokenValidation.OnTokenValidatedAsync(context);

        Assert.Null(context.Result);
    }

    [Theory]
    [InlineData(null, "100")]
    [InlineData("5", null)]
    [InlineData("not-a-number", "100")]
    public async Task Without_a_person_id_or_an_issue_time_the_cutoff_check_is_skipped(string? personId, string? issuedAt)
    {
        var revocation = new SessionRevocationService([]);
        revocation.Seed(5, Cutoff);
        var claims = new List<Claim> { new("jti", "jti-1") };
        AddIfSet(claims, PersonIdClaim.Type, personId);
        AddIfSet(claims, "iat", issuedAt);
        var context = Context(new ClaimsPrincipal(new ClaimsIdentity(claims, "test")), new FakeDenylist(), revocation);

        await AccessTokenValidation.OnTokenValidatedAsync(context);

        Assert.Null(context.Result);
    }

    [Fact]
    public async Task An_aborted_request_ends_quietly_without_failing_the_token_or_checking_the_cutoff()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        var denylist = new FakeDenylist { ThrowOnCheck = new OperationCanceledException(cts.Token) };
        var revocation = new SessionRevocationService([]);
        revocation.Seed(5, Cutoff);
        var context = Context(Principal(issuedAt: Seconds(Cutoff) - 100), denylist, revocation, cts.Token);

        await AccessTokenValidation.OnTokenValidatedAsync(context);

        Assert.Null(context.Result);
    }

    [Fact]
    public async Task A_cancellation_that_is_not_the_request_aborting_propagates()
    {
        var denylist = new FakeDenylist { ThrowOnCheck = new OperationCanceledException() };
        var context = Context(Principal(), denylist, new SessionRevocationService([]));

        await Assert.ThrowsAsync<OperationCanceledException>(() => AccessTokenValidation.OnTokenValidatedAsync(context));
    }
}
