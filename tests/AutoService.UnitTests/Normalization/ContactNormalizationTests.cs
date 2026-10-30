using AutoService.ApiService.Normalization;

namespace AutoService.UnitTests.Normalization;

/** Name, optional-value and e-mail rules of the shared contact normalization. */
public sealed class ContactNormalizationTests
{
    [Theory]
    [InlineData("Anna")]
    [InlineData("Kovács")]
    [InlineData("Mary-Jane")]
    [InlineData("Привет")]
    [InlineData("Αθηνά")]
    public void IsValidName_accepts_letters_of_any_script_and_hyphens(string name)
    {
        Assert.True(ContactNormalization.IsValidName(name));
    }

    [Theory]
    [InlineData("")]
    [InlineData("Anna Maria")]
    [InlineData("O'Neil")]
    [InlineData("An1")]
    [InlineData("Anna!")]
    [InlineData("A_b")]
    public void IsValidName_rejects_empty_spaces_digits_and_punctuation(string name)
    {
        Assert.False(ContactNormalization.IsValidName(name));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void NormalizeOptional_turns_blank_into_null(string? value)
    {
        Assert.Null(ContactNormalization.NormalizeOptional(value));
    }

    [Fact]
    public void NormalizeOptional_trims_a_value()
    {
        Assert.Equal("x y", ContactNormalization.NormalizeOptional("  x y "));
    }

    [Theory]
    [InlineData(" Anna@Example.Test ", "anna@example.test")]
    [InlineData("a.b+tag@example.test", "a.b+tag@example.test")]
    [InlineData("USER@EXAMPLE.HU", "user@example.hu")]
    public void TryNormalizeEmail_trims_and_lower_cases_a_valid_address(string raw, string expected)
    {
        Assert.True(ContactNormalization.TryNormalizeEmail(raw, out var normalized));
        Assert.Equal(expected, normalized);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("plain")]
    [InlineData("@example.test")]
    [InlineData("a@")]
    [InlineData("Anna <anna@example.test>")]
    public void TryNormalizeEmail_rejects_blank_malformed_and_display_name_forms(string? raw)
    {
        Assert.False(ContactNormalization.TryNormalizeEmail(raw, out var normalized));
        Assert.Equal(string.Empty, normalized);
    }
}
