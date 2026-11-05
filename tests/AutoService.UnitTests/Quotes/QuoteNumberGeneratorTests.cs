using AutoService.ApiService.Quotes;

namespace AutoService.UnitTests.Quotes;

/** The year's highest quote number is chosen numerically, so the sequence continues past 9999 (L9). */
public sealed class QuoteNumberGeneratorTests
{
    private const string Prefix = "ARSM-2026-";

    private static string? Highest(params string[] numbers) =>
        QuoteNumberGenerator.HighestFirst(numbers.AsQueryable(), Prefix).FirstOrDefault();

    [Fact]
    public void HighestFirst_ranks_a_five_digit_sequence_above_9999()
    {
        Assert.Equal("ARSM-2026-10000", Highest("ARSM-2026-9999", "ARSM-2026-10000", "ARSM-2026-0001"));
        Assert.Equal("ARSM-2026-10000", Highest("ARSM-2026-10000", "ARSM-2026-9999"));
    }

    [Fact]
    public void HighestFirst_compares_numbers_of_equal_length_by_text_and_ignores_other_years()
    {
        Assert.Equal("ARSM-2026-0042", Highest("ARSM-2026-0007", "ARSM-2026-0042", "ARSM-2025-12345"));
        Assert.Null(Highest("ARSM-2025-0001"));
    }

    [Theory]
    [InlineData(null, "ARSM-2026-0001")]
    [InlineData("ARSM-2026-0001", "ARSM-2026-0002")]
    [InlineData("ARSM-2026-9999", "ARSM-2026-10000")]
    [InlineData("ARSM-2026-10000", "ARSM-2026-10001")]
    public void FormatNext_continues_after_the_highest_number_and_starts_at_0001(string? highest, string expected)
    {
        Assert.Equal(expected, QuoteNumberGenerator.FormatNext(Prefix, highest));
    }
}
