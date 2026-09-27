using System;

namespace AutoService.ApiService.Pagination;

/// <summary>
/// Shared row-cap convention for unbounded list endpoints across feature
/// folders (Appointments, Vehicles, Customers, Catalog, Quotes, Admin).
/// Mirrors CustomerEndpoints.Lookup.cs's NormalizeCustomerLookupLimit
/// clamping convention, but as a single reusable type since it is
/// consumed by more than one feature.
/// </summary>
internal static class ListQueryLimits
{
    internal const int DefaultLimit = 500;
    internal const int MaxLimit = 500;

    /// <summary>
    /// Clamps a client-supplied limit to the allowed range, defaulting to
    /// <see cref="DefaultLimit"/> when absent.
    /// </summary>
    /// <param name="limit">Client-supplied limit, or null to use the default.</param>
    /// <returns>A value between 1 and <see cref="MaxLimit"/> inclusive.</returns>
    internal static int Normalize(int? limit)
        => Math.Clamp(limit ?? DefaultLimit, 1, MaxLimit);
}
