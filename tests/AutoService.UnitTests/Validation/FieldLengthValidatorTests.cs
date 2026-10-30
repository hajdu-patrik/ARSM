using AutoService.ApiService.Validation;

namespace AutoService.UnitTests.Validation;

/** The column-cap errors: at the limit passes, one over fails, null and earlier errors are left alone. */
public sealed class FieldLengthValidatorTests
{
    [Fact]
    public void Caps_match_the_database_columns_and_the_password_limit()
    {
        Assert.Equal(150, FieldLengthValidator.EmailMaxLength);
        Assert.Equal(50, FieldLengthValidator.NameMaxLength);
        Assert.Equal(20, FieldLengthValidator.PhoneNumberMaxLength);
        Assert.Equal(128, FieldLengthValidator.PasswordMaxLength);
    }

    [Fact]
    public void AddMaxLengthError_allows_a_value_exactly_at_the_limit()
    {
        var errors = new Dictionary<string, string[]>();

        FieldLengthValidator.AddMaxLengthError(errors, "Email", new string('a', 150), 150);

        Assert.Empty(errors);
    }

    [Fact]
    public void AddMaxLengthError_rejects_a_value_one_over_the_limit()
    {
        var errors = new Dictionary<string, string[]>();

        FieldLengthValidator.AddMaxLengthError(errors, "Email", new string('a', 151), 150);

        Assert.Equal(new[] { "Email must be at most 150 characters." }, errors["Email"]);
    }

    [Fact]
    public void AddMaxLengthError_ignores_a_null_value()
    {
        var errors = new Dictionary<string, string[]>();

        FieldLengthValidator.AddMaxLengthError(errors, "PhoneNumber", null, 20);

        Assert.Empty(errors);
    }

    [Fact]
    public void AddMaxLengthError_keeps_an_error_the_field_already_has()
    {
        var errors = new Dictionary<string, string[]> { ["FirstName"] = ["letters only"] };

        FieldLengthValidator.AddMaxLengthError(errors, "FirstName", new string('a', 51), 50);

        Assert.Equal(new[] { "letters only" }, errors["FirstName"]);
    }
}
