using System;

namespace AutoService.ApiService.Pagination;

/** Shared row-cap convention for unbounded list endpoints (see app/AutoService.ApiService/CLAUDE.md Auth and Runtime Anchors). */
internal static class ListQueryLimits
{
    internal const int DefaultLimit = 500;
    internal const int MaxLimit = 500;

    /** Clamps a client-supplied limit to the allowed range, defaulting to DefaultLimit when absent. */
    internal static int Normalize(int? limit)
        => Math.Clamp(limit ?? DefaultLimit, 1, MaxLimit);
}
