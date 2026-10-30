using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace AutoService.UnitTests.Auth;

/** The claims, signature and issue time of the access token the issuer writes. */
public sealed class JwtTokenIssuerTests
{
    private const string Secret = "unit-test-secret-of-at-least-thirty-two-bytes";
    private const string Issuer = "unit-test-issuer";
    private const string Audience = "unit-test-audience";

    private static readonly IdentityUser DefaultIdentity = new() { Id = "identity-1", Email = "identity@example.test" };

    private static Mechanic NewMechanic(bool mustChangePassword = false) =>
        new(new FullName("Bela", null, "Kovacs"), "person@example.test", null, SpecializationType.All, [ExpertiseType.Engine])
        {
            MustChangePassword = mustChangePassword
        };

    private static JwtSecurityToken Read(string token) => new JwtSecurityTokenHandler().ReadJwtToken(token);

    private static string Single(JwtSecurityToken jwt, string type) => jwt.Claims.Single(claim => claim.Type == type).Value;

    private static string Create(
        People person, IEnumerable<string>? roles = null, IdentityUser? user = null, ISessionRevocationService? revocation = null)
    {
        var issuer = new JwtTokenIssuer(Secret, Issuer, Audience, revocation ?? new SessionRevocationService([]));
        return issuer.CreateToken(user ?? DefaultIdentity, person, roles ?? Array.Empty<string>(), DateTime.UtcNow.AddMinutes(10));
    }

    [Fact]
    public void The_token_carries_the_identity_person_and_contact_claims()
    {
        var jwt = Read(Create(NewMechanic()));

        Assert.Equal("identity-1", Single(jwt, JwtRegisteredClaimNames.Sub));
        Assert.Equal("identity-1", Single(jwt, ClaimTypes.NameIdentifier));
        Assert.Equal("identity@example.test", Single(jwt, JwtRegisteredClaimNames.Email));
        Assert.Equal("identity@example.test", Single(jwt, ClaimTypes.Email));
        Assert.Equal("Bela Kovacs", Single(jwt, ClaimTypes.Name));
        Assert.Equal("0", Single(jwt, PersonIdClaim.Type));
        Assert.Equal("mechanic", Single(jwt, "person_type"));
        Assert.Equal(Issuer, jwt.Issuer);
        Assert.Equal(Audience, Assert.Single(jwt.Audiences));
    }

    [Fact]
    public void Without_an_identity_email_the_person_email_is_used()
    {
        var jwt = Read(Create(NewMechanic(), user: new IdentityUser { Id = "identity-2" }));

        Assert.Equal("person@example.test", Single(jwt, JwtRegisteredClaimNames.Email));
        Assert.Equal("person@example.test", Single(jwt, ClaimTypes.Email));
    }

    [Fact]
    public void A_customer_is_typed_customer()
    {
        var customer = new Customer(new FullName("Anna", null, "Nagy"), "customer@example.test", null);

        Assert.Equal("customer", Single(Read(Create(customer)), "person_type"));
    }

    [Fact]
    public void Every_role_becomes_a_role_claim()
    {
        var jwt = Read(Create(NewMechanic(), roles: ["Admin", "Mechanic"]));

        var roles = jwt.Claims.Where(claim => claim.Type == ClaimTypes.Role).Select(claim => claim.Value);
        Assert.Equal(new[] { "Admin", "Mechanic" }, roles.Order());
    }

    [Fact]
    public void No_roles_mean_no_role_claim()
    {
        Assert.DoesNotContain(Read(Create(NewMechanic())).Claims, claim => claim.Type == ClaimTypes.Role);
    }

    [Fact]
    public void Only_a_mechanic_on_a_temporary_password_carries_the_change_required_claim()
    {
        var gated = Read(Create(NewMechanic(mustChangePassword: true)));
        var normal = Read(Create(NewMechanic()));
        var customer = Read(Create(new Customer(new FullName("Anna", null, "Nagy"), "c@example.test", null)));

        Assert.Equal(PasswordChangeRequiredClaim.Value, Single(gated, PasswordChangeRequiredClaim.Type));
        Assert.DoesNotContain(normal.Claims, claim => claim.Type == PasswordChangeRequiredClaim.Type);
        Assert.DoesNotContain(customer.Claims, claim => claim.Type == PasswordChangeRequiredClaim.Type);
    }

    [Fact]
    public void Every_token_gets_its_own_32_hex_character_jti()
    {
        var first = Single(Read(Create(NewMechanic())), JwtRegisteredClaimNames.Jti);
        var second = Single(Read(Create(NewMechanic())), JwtRegisteredClaimNames.Jti);

        Assert.NotEqual(first, second);
        Assert.Matches("^[0-9a-f]{32}$", first);
    }

    [Fact]
    public void The_expiry_and_a_now_dated_iat_and_not_before_are_written()
    {
        var expires = DateTime.UtcNow.AddMinutes(10);
        var token = new JwtTokenIssuer(Secret, Issuer, Audience, new SessionRevocationService([]))
            .CreateToken(DefaultIdentity, NewMechanic(), [], expires);
        var jwt = Read(token);

        var iat = long.Parse(Single(jwt, JwtRegisteredClaimNames.Iat));
        Assert.Equal(new DateTimeOffset(expires).ToUnixTimeSeconds(), new DateTimeOffset(jwt.ValidTo).ToUnixTimeSeconds());
        Assert.InRange(iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds() - 5, DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 1);
        Assert.Equal(iat, new DateTimeOffset(jwt.ValidFrom).ToUnixTimeSeconds());
    }

    [Fact]
    public void A_session_cutoff_ahead_of_now_dates_the_token_at_the_cutoff()
    {
        var revocation = new SessionRevocationService([]);
        var cutoff = DateTimeOffset.FromUnixTimeSeconds(DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 20).UtcDateTime;
        revocation.Seed(0, cutoff);

        var jwt = Read(Create(NewMechanic(), revocation: revocation));

        var expected = new DateTimeOffset(cutoff).ToUnixTimeSeconds();
        Assert.Equal(expected, long.Parse(Single(jwt, JwtRegisteredClaimNames.Iat)));
        Assert.Equal(expected, new DateTimeOffset(jwt.ValidFrom).ToUnixTimeSeconds());
    }

    [Fact]
    public void The_row_cutoff_ahead_of_now_dates_the_token_at_the_row_cutoff()
    {
        var person = NewMechanic();
        person.TokensValidAfter = DateTimeOffset.FromUnixTimeSeconds(DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 20).UtcDateTime;

        var jwt = Read(Create(person));

        var expected = new DateTimeOffset(person.TokensValidAfter.Value).ToUnixTimeSeconds();
        Assert.Equal(expected, long.Parse(Single(jwt, JwtRegisteredClaimNames.Iat)));
    }

    [Fact]
    public void The_token_is_signed_with_hs256_and_validates_only_against_the_same_secret()
    {
        var token = Create(NewMechanic());
        var handler = new JwtSecurityTokenHandler();

        handler.ValidateToken(token, JwtValidationParameters.Create(Secret, Issuer, Audience), out var validated);

        Assert.Equal(SecurityAlgorithms.HmacSha256, Read(token).Header.Alg);
        Assert.NotNull(validated);
        Assert.ThrowsAny<SecurityTokenException>(() => handler.ValidateToken(
            token, JwtValidationParameters.Create("another-secret-of-at-least-thirty-two-bytes", Issuer, Audience), out _));
    }
}
