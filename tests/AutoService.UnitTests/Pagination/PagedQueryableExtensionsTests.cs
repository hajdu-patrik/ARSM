using AutoService.ApiService.Pagination;

namespace AutoService.UnitTests.Pagination;

/** ToPagedResultAsync counts the whole query, then reads exactly one page of the given order. */
public sealed class PagedQueryableExtensionsTests
{
    private static IQueryable<int> Ordered(int count) =>
        new AsyncTestQueryable<int>(Enumerable.Range(1, count).Reverse()).OrderBy(value => value);

    [Fact]
    public async Task First_page_holds_the_first_rows_in_order_with_the_total()
    {
        var result = await Ordered(25).ToPagedResultAsync(new PageRequest(1, 10), CancellationToken.None);

        Assert.Equal(Enumerable.Range(1, 10), result.Items);
        Assert.Equal(25, result.TotalCount);
        Assert.Equal(1, result.Page);
        Assert.Equal(10, result.PageSize);
    }

    [Fact]
    public async Task Last_page_holds_only_the_remaining_rows()
    {
        var result = await Ordered(25).ToPagedResultAsync(new PageRequest(3, 10), CancellationToken.None);

        Assert.Equal(Enumerable.Range(21, 5), result.Items);
        Assert.Equal(25, result.TotalCount);
    }

    [Fact]
    public async Task A_page_past_the_end_is_empty_but_still_reports_the_total()
    {
        var result = await Ordered(25).ToPagedResultAsync(new PageRequest(4, 10), CancellationToken.None);

        Assert.Empty(result.Items);
        Assert.Equal(25, result.TotalCount);
        Assert.Equal(4, result.Page);
    }

    [Fact]
    public async Task A_page_size_larger_than_the_result_returns_everything()
    {
        var result = await Ordered(3).ToPagedResultAsync(new PageRequest(1, 500), CancellationToken.None);

        Assert.Equal(new[] { 1, 2, 3 }, result.Items);
        Assert.Equal(3, result.TotalCount);
    }

    [Fact]
    public async Task An_empty_query_gives_an_empty_page_with_a_zero_total()
    {
        var result = await Ordered(0).ToPagedResultAsync(new PageRequest(1, 20), CancellationToken.None);

        Assert.Empty(result.Items);
        Assert.Equal(0, result.TotalCount);
    }

    [Fact]
    public async Task The_page_follows_the_order_of_the_query_it_is_given()
    {
        var descending = new AsyncTestQueryable<int>(Enumerable.Range(1, 5)).OrderByDescending(value => value);

        var result = await descending.ToPagedResultAsync(new PageRequest(2, 2), CancellationToken.None);

        Assert.Equal(new[] { 3, 2 }, result.Items);
    }
}
