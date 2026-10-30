using AutoService.ApiService.Validation;

namespace AutoService.UnitTests.Validation;

/** Enum text from a DTO: only a defined member's name passes, never a number or a comma list. */
public sealed class DefinedEnumTests
{
    public enum Sample
    {
        First = 0,
        Second = 1,
    }

    [Theory]
    [InlineData("First", Sample.First)]
    [InlineData("second", Sample.Second)]
    [InlineData("  SECOND ", Sample.Second)]
    public void A_member_name_passes_in_any_case_and_padding(string raw, Sample expected)
    {
        Assert.True(DefinedEnum.TryParse<Sample>(raw, out var value));
        Assert.Equal(expected, value);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("0")]
    [InlineData("1")]
    [InlineData("7")]
    [InlineData("-1")]
    [InlineData("First,Second")]
    [InlineData("Third")]
    public void Anything_else_is_refused(string? raw)
    {
        Assert.False(DefinedEnum.TryParse<Sample>(raw, out _));
    }
}
