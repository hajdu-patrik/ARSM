namespace AutoService.ApiService.Pagination;

/** Normalizes free-text list search input into an upper-case, length-capped term. */
internal static class SearchTerm
{
    internal const int MaxLength = 100;

    /** Trims, truncates to 100 chars and uppercases; null when blank. */
    internal static string? Normalize(string? raw)
    {
        var trimmed = raw?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        if (trimmed.Length > MaxLength)
        {
            trimmed = trimmed[..MaxLength];
        }

        return trimmed.ToUpperInvariant();
    }
}
