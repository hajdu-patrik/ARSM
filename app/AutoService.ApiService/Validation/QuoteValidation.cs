namespace AutoService.ApiService.Validation;

/** Quote-specific validation; NetUnitPrice/Quantity/VatRatePercent reuse
 * PricingValidation verbatim instead (CLAUDE.md Quote Anchors). */
internal static class QuoteValidation
{
    internal const int MaxTitleLength = 120;
    internal const int MaxLineCount = 200;

    /** Validates the required quote title (D14): must be present and at most MaxTitleLength characters. */
    internal static string? GetTitleValidationError(string? title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return ValidationMessages.QuoteTitleRequired;
        }

        if (title.Length > MaxTitleLength)
        {
            return ValidationMessages.QuoteTitleTooLong;
        }

        return null;
    }

    /** Rejects a past ValidUntil (D22), on both creation and later updates. */
    internal static string? GetValidUntilValidationError(DateTime validUntil, DateTime nowUtc)
    {
        if (validUntil < nowUtc)
        {
            return ValidationMessages.QuoteValidUntilInPast;
        }

        return null;
    }

    /** Enforces the 200-line-per-quote cap (D24): a handler-level check, since a
     * per-row CHECK constraint cannot see sibling row counts. */
    internal static string? GetLineCountValidationError(int currentLineCount)
    {
        if (currentLineCount >= MaxLineCount)
        {
            return ValidationMessages.QuoteLineLimitExceeded;
        }

        return null;
    }
}
