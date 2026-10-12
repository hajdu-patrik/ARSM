namespace AutoService.ApiService.Pagination;

/** Normalized 1-based page and page size. */
internal readonly record struct PageRequest(int Page, int PageSize)
{
    internal int Skip => (Page - 1) * PageSize;
}
