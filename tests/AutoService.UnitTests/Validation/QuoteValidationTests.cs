using AutoService.ApiService.Validation;

namespace AutoService.UnitTests.Validation;

/** Quote title, validity and line-count rules with their stable messages. */
public sealed class QuoteValidationTests
{
    private static readonly DateTime Now = new(2026, 10, 30, 12, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void GetTitleValidationError_requires_a_title(string? title)
    {
        Assert.Equal(ValidationMessages.QuoteTitleRequired, QuoteValidation.GetTitleValidationError(title));
    }

    [Fact]
    public void GetTitleValidationError_allows_exactly_the_maximum_length()
    {
        Assert.Null(QuoteValidation.GetTitleValidationError(new string('t', QuoteValidation.MaxTitleLength)));
    }

    [Fact]
    public void GetTitleValidationError_rejects_one_character_over_the_maximum()
    {
        var title = new string('t', QuoteValidation.MaxTitleLength + 1);

        Assert.Equal(ValidationMessages.QuoteTitleTooLong, QuoteValidation.GetTitleValidationError(title));
    }

    [Fact]
    public void GetValidUntilValidationError_accepts_now_and_the_future()
    {
        Assert.Null(QuoteValidation.GetValidUntilValidationError(Now, Now));
        Assert.Null(QuoteValidation.GetValidUntilValidationError(Now.AddDays(30), Now));
    }

    [Fact]
    public void GetValidUntilValidationError_rejects_a_moment_in_the_past()
    {
        Assert.Equal(
            ValidationMessages.QuoteValidUntilInPast,
            QuoteValidation.GetValidUntilValidationError(Now.AddTicks(-1), Now));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(199)]
    public void GetLineCountValidationError_allows_adding_below_the_cap(int currentLineCount)
    {
        Assert.Null(QuoteValidation.GetLineCountValidationError(currentLineCount));
    }

    [Theory]
    [InlineData(200)]
    [InlineData(201)]
    public void GetLineCountValidationError_refuses_the_201st_line(int currentLineCount)
    {
        Assert.Equal(ValidationMessages.QuoteLineLimitExceeded, QuoteValidation.GetLineCountValidationError(currentLineCount));
    }

    [Fact]
    public void Limits_are_the_documented_constants()
    {
        Assert.Equal(120, QuoteValidation.MaxTitleLength);
        Assert.Equal(200, QuoteValidation.MaxLineCount);
    }
}
