namespace AutoService.ApiService.Pagination;

/** One page of a list endpoint with the total match count across all pages. */
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize)
{
    public PagedResult<TResult> Map<TResult>(Func<T, TResult> selector)
        => new(Items.Select(selector).ToList(), TotalCount, Page, PageSize);
}
