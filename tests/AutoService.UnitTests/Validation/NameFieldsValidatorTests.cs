using AutoService.ApiService.Validation;

namespace AutoService.UnitTests.Validation;

/** Name validation: letters and hyphens only, trimming, blank values ignored, and the per-field messages. */
public sealed class NameFieldsValidatorTests
{
    private static Dictionary<string, string[]> Validate(string? first, string? middle, string? last)
    {
        var errors = new Dictionary<string, string[]>();
        NameFieldsValidator.ValidateNames(first, middle, last, errors);
        return errors;
    }

    [Theory]
    [InlineData("Anna", null, "Kovács")]
    [InlineData("Mary-Jane", "Éva", "Smith-Jones")]
    [InlineData("  Anna  ", "  ", "  Kovács ")]
    [InlineData(null, null, null)]
    public void ValidateNames_accepts_letters_hyphens_and_blank_optional_values(string? first, string? middle, string? last)
    {
        Assert.Empty(Validate(first, middle, last));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ValidateNames_does_not_report_blank_names(string? blank)
    {
        Assert.Empty(Validate(blank, blank, blank));
    }

    [Theory]
    [InlineData("An1na")]
    [InlineData("Anna Maria")]
    [InlineData("O'Neil")]
    [InlineData("Anna!")]
    [InlineData("A_b")]
    public void ValidateNames_rejects_digits_spaces_and_punctuation_in_every_name(string invalid)
    {
        var errors = Validate(invalid, invalid, invalid);

        Assert.Equal(new[] { ValidationMessages.InvalidFirstName }, errors["FirstName"]);
        Assert.Equal(new[] { ValidationMessages.InvalidMiddleName }, errors["MiddleName"]);
        Assert.Equal(new[] { ValidationMessages.InvalidLastName }, errors["LastName"]);
    }

    [Fact]
    public void ValidateNames_flags_only_the_invalid_name()
    {
        var errors = Validate("Anna", "B0", "Kovács");

        Assert.Equal(new[] { "MiddleName" }, errors.Keys);
    }

    [Fact]
    public void ValidateNames_keeps_errors_the_caller_already_collected()
    {
        var errors = new Dictionary<string, string[]> { ["Email"] = ["bad"] };

        NameFieldsValidator.ValidateNames("A1", null, null, errors);

        Assert.Equal(new[] { "bad" }, errors["Email"]);
        Assert.Contains("FirstName", errors.Keys);
    }

    [Theory]
    [InlineData("FirstName", ValidationMessages.InvalidFirstName)]
    [InlineData("LastName", ValidationMessages.InvalidLastName)]
    [InlineData("MiddleName", ValidationMessages.InvalidMiddleName)]
    [InlineData("Nickname", "Nickname may only contain letters and hyphens.")]
    public void GetNameError_names_the_field_in_the_message(string fieldName, string expected)
    {
        Assert.Equal(expected, NameFieldsValidator.GetNameError("B4d", fieldName));
    }

    [Theory]
    [InlineData("Anna")]
    [InlineData("Kovács-Nagy")]
    public void GetNameError_is_null_for_a_valid_name(string name)
    {
        Assert.Null(NameFieldsValidator.GetNameError(name, "FirstName"));
    }
}
