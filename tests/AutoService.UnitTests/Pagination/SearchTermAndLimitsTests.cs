using AutoService.ApiService.Pagination;

namespace AutoService.UnitTests.Pagination;

/** Search term normalization, the row-cap clamps and the page arithmetic every list endpoint shares. */
public sealed class SearchTermAndLimitsTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void SearchTerm_turns_blank_input_into_null(string? raw)
    {
        Assert.Null(SearchTerm.Normalize(raw));
    }

    [Theory]
    [InlineData("  abc  ", "ABC")]
    [InlineData("őű Kovács", "ŐŰ KOVÁCS")]
    public void SearchTerm_trims_and_upper_cases(string raw, string expected)
    {
        Assert.Equal(expected, SearchTerm.Normalize(raw));
    }

    [Fact]
    public void SearchTerm_keeps_exactly_100_characters_and_cuts_the_rest()
    {
        Assert.Equal(new string('A', 100), SearchTerm.Normalize(new string('a', 100)));
        Assert.Equal(new string('A', 100), SearchTerm.Normalize(new string('a', 150)));
    }

    [Fact]
    public void SearchTerm_counts_the_length_after_trimming()
    {
        Assert.Equal(new string('A', 100), SearchTerm.Normalize("   " + new string('a', 100) + "   "));
    }

    [Theory]
    [InlineData(null, 500)]
    [InlineData(0, 1)]
    [InlineData(-5, 1)]
    [InlineData(1, 1)]
    [InlineData(250, 250)]
    [InlineData(500, 500)]
    [InlineData(501, 500)]
    [InlineData(int.MaxValue, 500)]
    public void ListQueryLimits_Normalize_clamps_the_limit_to_1_through_500(int? limit, int expected)
    {
        Assert.Equal(expected, ListQueryLimits.Normalize(limit));
    }

    [Fact]
    public void ListQueryLimits_NormalizePage_defaults_to_the_first_page_of_20()
    {
        var request = ListQueryLimits.NormalizePage(null, null);

        Assert.Equal(new PageRequest(1, 20), request);
        Assert.Equal(0, request.Skip);
    }

    [Theory]
    [InlineData(0, 0, 1, 1)]
    [InlineData(-3, -1, 1, 1)]
    [InlineData(3, 50, 3, 50)]
    [InlineData(2, 9999, 2, 500)]
    public void ListQueryLimits_NormalizePage_clamps_page_and_page_size(int page, int pageSize, int expectedPage, int expectedSize)
    {
        Assert.Equal(new PageRequest(expectedPage, expectedSize), ListQueryLimits.NormalizePage(page, pageSize));
    }

    [Fact]
    public void ListQueryLimits_NormalizePage_keeps_the_skip_inside_an_int_for_the_largest_page()
    {
        var request = ListQueryLimits.NormalizePage(int.MaxValue, int.MaxValue);

        Assert.Equal(ListQueryLimits.MaxPage, request.Page);
        Assert.Equal(ListQueryLimits.MaxPageSize, request.PageSize);
        Assert.True(request.Skip > 0);
    }

    [Theory]
    [InlineData(1, 20, 0)]
    [InlineData(3, 20, 40)]
    [InlineData(2, 500, 500)]
    public void PageRequest_Skip_is_the_rows_of_the_earlier_pages(int page, int pageSize, int expected)
    {
        Assert.Equal(expected, new PageRequest(page, pageSize).Skip);
    }

    [Fact]
    public void PagedResult_Map_converts_the_items_and_keeps_the_paging_numbers()
    {
        var result = new PagedResult<int>([1, 2, 3], TotalCount: 42, Page: 2, PageSize: 3);

        var mapped = result.Map(value => $"#{value}");

        Assert.Equal(new[] { "#1", "#2", "#3" }, mapped.Items);
        Assert.Equal(42, mapped.TotalCount);
        Assert.Equal(2, mapped.Page);
        Assert.Equal(3, mapped.PageSize);
    }

    [Fact]
    public void PagedResult_Map_of_an_empty_page_stays_empty()
    {
        var mapped = new PagedResult<int>([], 0, 1, 20).Map(value => value * 2);

        Assert.Empty(mapped.Items);
        Assert.Equal(0, mapped.TotalCount);
    }
}
