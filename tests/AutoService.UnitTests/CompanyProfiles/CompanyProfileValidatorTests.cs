using AutoService.ApiService.CompanyProfiles;

namespace AutoService.UnitTests.CompanyProfiles;

/** Every field is required and trimmed; limits, formats and normalization are checked, errors keyed by camelCase name. */
public sealed class CompanyProfileValidatorTests
{
    private static CompanyProfileEndpoints.CompanyProfileDto Valid() => new(
        "Test Kft.", "Fo utca 1.", "1111", "Budapest", "11111111-1-11", "+36 30 444 5566", "Info@Example.Test");

    private static Dictionary<string, string[]> ErrorsOf(CompanyProfileEndpoints.CompanyProfileDto request)
        => CompanyProfileValidator.Validate(request).Errors;

    [Fact]
    public void A_valid_request_has_no_errors_and_comes_back_normalized()
    {
        var (profile, errors) = CompanyProfileValidator.Validate(Valid());

        Assert.Empty(errors);
        Assert.Equal("+36304445566", profile.PhoneNumber);
        Assert.Equal("info@example.test", profile.Email);
        Assert.Equal("Test Kft.", profile.Name);
    }

    [Fact]
    public void Surrounding_space_is_trimmed_before_the_checks()
    {
        var request = Valid() with { Name = "  Test Kft.  ", City = " Budapest ", PostalCode = " 1111 ", TaxNumber = " 11111111-1-11 " };

        var (profile, errors) = CompanyProfileValidator.Validate(request);

        Assert.Empty(errors);
        Assert.Equal(("Test Kft.", "Budapest", "1111", "11111111-1-11"), (profile.Name, profile.City, profile.PostalCode, profile.TaxNumber));
    }

    [Theory]
    [InlineData("name")]
    [InlineData("addressLine")]
    [InlineData("postalCode")]
    [InlineData("city")]
    [InlineData("taxNumber")]
    [InlineData("phoneNumber")]
    [InlineData("email")]
    public void A_missing_or_blank_field_is_reported_under_its_camel_case_name(string field)
    {
        var withNull = SetField(Valid(), field, null);
        var withBlank = SetField(Valid(), field, "   ");

        Assert.Equal($"{field} cannot be empty.", Assert.Single(ErrorsOf(withNull)[field]));
        Assert.Equal($"{field} cannot be empty.", Assert.Single(ErrorsOf(withBlank)[field]));
        Assert.Single(ErrorsOf(withBlank));
    }

    private static CompanyProfileEndpoints.CompanyProfileDto SetField(CompanyProfileEndpoints.CompanyProfileDto request, string field, string? value)
        => field switch
        {
            "name" => request with { Name = value! },
            "addressLine" => request with { AddressLine = value! },
            "postalCode" => request with { PostalCode = value! },
            "city" => request with { City = value! },
            "taxNumber" => request with { TaxNumber = value! },
            "phoneNumber" => request with { PhoneNumber = value! },
            _ => request with { Email = value! },
        };

    [Theory]
    [InlineData("name", 150)]
    [InlineData("addressLine", 150)]
    [InlineData("city", 50)]
    public void Text_fields_accept_their_limit_and_refuse_one_more(string field, int limit)
    {
        Assert.Empty(ErrorsOf(SetField(Valid(), field, new string('a', limit))));

        var errors = ErrorsOf(SetField(Valid(), field, new string('a', limit + 1)));

        Assert.Equal($"{field} must be at most {limit} characters.", Assert.Single(errors[field]));
    }

    [Theory]
    [InlineData("123")]
    [InlineData("12345")]
    [InlineData("12a4")]
    [InlineData("1 11")]
    [InlineData("١٢٣٤")]
    public void The_postal_code_is_exactly_four_digits(string postalCode)
    {
        var errors = ErrorsOf(Valid() with { PostalCode = postalCode });

        Assert.Equal("postalCode must be exactly 4 digits.", Assert.Single(errors["postalCode"]));
    }

    [Theory]
    [InlineData("1234567-1-12")]
    [InlineData("12345678-12-12")]
    [InlineData("12345678112")]
    [InlineData("12345678-1-123")]
    [InlineData("abcdefgh-1-12")]
    [InlineData("١٢٣٤٥٦٧٨-١-١٢")]
    public void The_tax_number_follows_the_8_1_2_digit_format(string taxNumber)
    {
        var errors = ErrorsOf(Valid() with { TaxNumber = taxNumber });

        Assert.Equal("taxNumber must match the format 12345678-1-12.", Assert.Single(errors["taxNumber"]));
    }

    [Theory]
    [InlineData("123", "Phone number must be a valid European number.")]
    [InlineData("+1 202 555 0143", "Phone number must be a valid European number.")]
    [InlineData("+36 30 444 5566 ext 12345", "phoneNumber must be at most 20 characters.")]
    public void The_phone_number_must_be_short_enough_and_a_valid_european_number(string phone, string expected)
    {
        var errors = ErrorsOf(Valid() with { PhoneNumber = phone });

        Assert.Equal(expected, Assert.Single(errors["phoneNumber"]));
    }

    [Fact]
    public void A_local_hungarian_phone_is_normalized_to_e164()
    {
        var (profile, errors) = CompanyProfileValidator.Validate(Valid() with { PhoneNumber = "06 30 444 5566" });

        Assert.Empty(errors);
        Assert.Equal("+36304445566", profile.PhoneNumber);
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("a@b@c.test")]
    public void An_invalid_email_is_reported(string email)
    {
        var errors = ErrorsOf(Valid() with { Email = email });

        Assert.Equal("Email must be a valid email address.", Assert.Single(errors["email"]));
    }

    [Fact]
    public void An_email_over_150_characters_is_reported_before_the_format_check()
    {
        var errors = ErrorsOf(Valid() with { Email = new string('a', 140) + "@example.test" });

        Assert.Equal("email must be at most 150 characters.", Assert.Single(errors["email"]));
    }

    [Fact]
    public void Every_broken_field_is_reported_in_one_pass()
    {
        var request = new CompanyProfileEndpoints.CompanyProfileDto("", "", "x", "", "x", "x", "x");

        Assert.Equal(7, ErrorsOf(request).Count);
    }
}
