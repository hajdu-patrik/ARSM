using System.Diagnostics.CodeAnalysis;
using System.Security.Claims;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Identity;
using Microsoft.AspNetCore.Identity;

namespace AutoService.UnitTests.Identity;

/** Person type names, the person_id claim and the Identity error grouping the endpoints rely on. */
public sealed class IdentityHelpersTests
{
    private sealed class UnsupportedPerson : People
    {
        [SetsRequiredMembers]
        public UnsupportedPerson() : base(new FullName("X", null, "Y"), "x@example.test", null)
        {
        }
    }

    private static ClaimsPrincipal PrincipalWith(params Claim[] claims) => new(new ClaimsIdentity(claims, "test"));

    [Fact]
    public void PersonTypeResolver_names_a_mechanic_and_a_customer()
    {
        var mechanic = new Mechanic(new FullName("Béla", null, "Szabó"), "bela@example.test", null, SpecializationType.All, [ExpertiseType.Engine]);
        var customer = new Customer(new FullName("Anna", null, "Kovács"), "anna@example.test", null);

        Assert.Equal("mechanic", PersonTypeResolver.Resolve(mechanic));
        Assert.Equal("customer", PersonTypeResolver.Resolve(customer));
    }

    [Fact]
    public void PersonTypeResolver_refuses_any_other_person_type()
    {
        var error = Assert.Throws<InvalidOperationException>(() => PersonTypeResolver.Resolve(new UnsupportedPerson()));

        Assert.Equal("Unsupported person type.", error.Message);
    }

    [Fact]
    public void PersonIdClaim_reads_the_person_id_of_the_caller()
    {
        var user = PrincipalWith(new Claim(PersonIdClaim.Type, "42"));

        Assert.True(user.TryGetPersonId(out var personId));
        Assert.Equal(42, personId);
        Assert.Equal(42, user.GetPersonIdOrDefault());
        Assert.Equal("person_id", PersonIdClaim.Type);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("abc")]
    [InlineData("4.2")]
    [InlineData("99999999999")]
    public void PersonIdClaim_treats_a_missing_or_malformed_claim_as_no_person(string? value)
    {
        var user = value is null ? PrincipalWith() : PrincipalWith(new Claim(PersonIdClaim.Type, value));

        Assert.False(user.TryGetPersonId(out var personId));
        Assert.Equal(0, personId);
        Assert.Equal(0, user.GetPersonIdOrDefault());
    }

    [Fact]
    public void ToValidationErrors_groups_the_descriptions_by_identity_error_code()
    {
        var result = IdentityResult.Failed(
            new IdentityError { Code = "PasswordTooShort", Description = "Too short." },
            new IdentityError { Code = "PasswordRequiresDigit", Description = "Needs a digit." },
            new IdentityError { Code = "PasswordTooShort", Description = "Really too short." });

        var errors = result.ToValidationErrors();

        Assert.Equal(2, errors.Count);
        Assert.Equal(new[] { "Too short.", "Really too short." }, errors["PasswordTooShort"]);
        Assert.Equal(new[] { "Needs a digit." }, errors["PasswordRequiresDigit"]);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void ToValidationErrors_files_a_code_less_error_under_the_default_key(string? code)
    {
        var result = IdentityResult.Failed(new IdentityError { Code = code!, Description = "Something failed." });

        Assert.Equal(new[] { "Something failed." }, result.ToValidationErrors()["identity"]);
    }

    [Fact]
    public void ToValidationErrors_uses_the_caller_fallback_key()
    {
        var result = IdentityResult.Failed(new IdentityError { Code = "", Description = "No code." });

        Assert.Equal(new[] { "No code." }, result.ToValidationErrors("password")["password"]);
    }

    [Fact]
    public void ToValidationErrors_of_a_success_is_empty()
    {
        Assert.Empty(IdentityResult.Success.ToValidationErrors());
    }
}
