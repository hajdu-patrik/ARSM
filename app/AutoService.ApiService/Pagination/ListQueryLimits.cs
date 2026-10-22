namespace AutoService.ApiService.Pagination;

/** Shared row-cap convention for unbounded list endpoints (see app/AutoService.ApiService/CLAUDE.md Auth and Runtime Anchors). */
internal static class ListQueryLimits
{
    internal const int DefaultLimit = 500;
    internal const int MaxLimit = 500;
    internal const int DefaultPageSize = 20;
    internal const int MaxPageSize = 500;

    /** Clamps a client-supplied limit to the allowed range, defaulting to DefaultLimit when absent. */
    internal static int Normalize(int? limit)
        => Math.Clamp(limit ?? DefaultLimit, 1, MaxLimit);

    /** Normalizes page (below 1 becomes 1) and pageSize (default 20, clamped 1..500). */
    internal static PageRequest NormalizePage(int? page, int? pageSize)
        => new(Math.Max(page ?? 1, 1), Math.Clamp(pageSize ?? DefaultPageSize, 1, MaxPageSize));
}
