namespace AutoService.ApiService.Validation;

/**
 * Quote-specific validation that has no existing home elsewhere.
 * NetUnitPrice, Quantity, and VatRatePercent on a QuoteLine reuse
 * PricingValidation's GetMoneyAmountValidationError,
 * GetQuantityValidationError, and GetVatRateValidationError verbatim;
 * they are intentionally not duplicated here.
 */
internal static class QuoteValidation
{
    internal const int MaxTitleLength = 120;
    internal const int MaxLineCount = 200;

    /**
     * Validates the required quote title (D14): must be present and at
     * most MaxTitleLength characters.
     *
     * @param title The candidate quote title.
     * @return Validation message when invalid; otherwise null.
     */
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

    /**
     * Rejects a past ValidUntil (D22), on both creation and later updates.
     *
     * @param validUntil The candidate validity deadline.
     * @param nowUtc The current UTC instant, passed in so callers stay testable.
     * @return Validation message when invalid; otherwise null.
     */
    internal static string? GetValidUntilValidationError(DateTime validUntil, DateTime nowUtc)
    {
        if (validUntil < nowUtc)
        {
            return ValidationMessages.QuoteValidUntilInPast;
        }

        return null;
    }

    /**
     * Enforces the 200-line-per-quote cap (D24). This is a handler-level
     * check, not a check constraint, because a per-row CHECK cannot see
     * how many sibling rows already exist on the same quote.
     *
     * @param currentLineCount Number of lines already on the quote before adding one more.
     * @return Validation message when invalid; otherwise null.
     */
    internal static string? GetLineCountValidationError(int currentLineCount)
    {
        if (currentLineCount >= MaxLineCount)
        {
            return ValidationMessages.QuoteLineLimitExceeded;
        }

        return null;
    }
}
