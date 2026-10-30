using AutoService.ApiService.Customers;
using AutoService.ApiService.Validation;

namespace AutoService.UnitTests.Customers;

/** The checks customer create and update share, in their fixed order, and the mapping to a name. */
public sealed class CustomerInputTests
{
    private static CustomerInput Input(
        string first = "Anna", string? middle = null, string last = "Kovács", string email = "anna@example.test", string? phone = null) =>
        new(first, middle, last, email, phone);

    [Theory]
    [InlineData("", "Kovács", "a@example.test")]
    [InlineData("Anna", "  ", "a@example.test")]
    [InlineData("Anna", "Kovács", "")]
    public void GetFieldError_requires_first_name_last_name_and_email(string first, string last, string email)
    {
        Assert.Equal("FirstName, LastName, and Email are required.", Input(first, null, last, email).GetFieldError());
    }

    [Fact]
    public void GetFieldError_is_null_for_valid_names_with_surrounding_spaces_and_a_blank_middle_name()
    {
        Assert.Null(Input(" Anna ", "  ", " Kovács ").GetFieldError());
        Assert.Null(Input(middle: "Mária-Éva").GetFieldError());
    }

    [Fact]
    public void GetFieldError_names_the_first_invalid_name_in_first_last_middle_order()
    {
        Assert.Equal(ValidationMessages.InvalidFirstName, Input(first: "A1", last: "K2", middle: "M3").GetFieldError());
        Assert.Equal(ValidationMessages.InvalidLastName, Input(last: "K2", middle: "M3").GetFieldError());
        Assert.Equal(ValidationMessages.InvalidMiddleName, Input(middle: "M3").GetFieldError());
    }

    [Fact]
    public void NormalizeContact_normalizes_a_valid_email_and_phone()
    {
        var error = Input(email: " Anna@Example.Test ", phone: "06 20 123 4567").NormalizeContact(out var email, out var phone);

        Assert.Null(error);
        Assert.Equal("anna@example.test", email);
        Assert.Equal("+36201234567", phone);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void NormalizeContact_treats_a_blank_phone_as_none(string? phone)
    {
        var error = Input(phone: phone).NormalizeContact(out _, out var normalizedPhone);

        Assert.Null(error);
        Assert.Null(normalizedPhone);
    }

    [Fact]
    public void NormalizeContact_reports_an_invalid_email_before_looking_at_the_phone()
    {
        var error = Input(email: "not-an-email", phone: "nonsense").NormalizeContact(out _, out _);

        Assert.Equal(ValidationMessages.InvalidEmail, error);
    }

    [Theory]
    [InlineData("nonsense")]
    [InlineData("+1 650 253 0000")]
    public void NormalizeContact_reports_a_phone_that_is_not_a_valid_european_number(string phone)
    {
        var error = Input(phone: phone).NormalizeContact(out _, out _);

        Assert.Equal(ValidationMessages.InvalidPhone, error);
    }

    [Fact]
    public void GetLengthErrors_is_empty_at_the_limits_and_measures_names_after_trimming()
    {
        var input = Input(first: "  " + new string('a', 50) + "  ", middle: new string('b', 50), last: new string('c', 50));

        Assert.Empty(input.GetLengthErrors(new string('e', 150), new string('1', 20)));
    }

    [Fact]
    public void GetLengthErrors_keys_each_error_by_the_request_property()
    {
        var input = Input(first: new string('a', 51), middle: new string('b', 51), last: new string('c', 51));

        var errors = input.GetLengthErrors(new string('e', 151), new string('1', 21));

        Assert.Equal(
            new[] { "Email", "FirstName", "LastName", "MiddleName", "PhoneNumber" },
            errors.Keys.OrderBy(key => key).ToArray());
        Assert.Equal(new[] { "Email must be at most 150 characters." }, errors["Email"]);
        Assert.Equal(new[] { "PhoneNumber must be at most 20 characters." }, errors["PhoneNumber"]);
    }

    [Fact]
    public void GetLengthErrors_ignores_a_missing_phone()
    {
        Assert.Empty(Input().GetLengthErrors("anna@example.test", null));
    }

    [Fact]
    public void ToFullName_trims_the_names_and_keeps_an_absent_middle_name_null()
    {
        var name = Input(first: " Anna ", last: " Kovács ").ToFullName();

        Assert.Equal(("Anna", (string?)null, "Kovács"), (name.FirstName, name.MiddleName, name.LastName));
        Assert.Equal("Anna Mária Kovács", Input(middle: " Mária ").ToFullName().ToString());
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void ToFullName_stores_a_blank_middle_name_as_null(string middleName)
    {
        Assert.Null(Input(middle: middleName).ToFullName().MiddleName);
    }
}
