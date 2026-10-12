using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Pagination;

internal static class PagedQueryableExtensions
{
    /** Counts, then reads one page of an already ordered query. */
    internal static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> orderedQuery,
        PageRequest request,
        CancellationToken ct)
    {
        var total = await orderedQuery.CountAsync(ct);
        var items = await orderedQuery.Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<T>(items, total, request.Page, request.PageSize);
    }
}
