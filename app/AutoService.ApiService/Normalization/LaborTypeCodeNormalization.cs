namespace AutoService.ApiService.Normalization;

/**
 * Normalizes labor type codes to a trimmed, uppercase canonical form.
 */
internal static class LaborTypeCodeNormalization
{
    /**
     * Normalizes a labor type code to trimmed uppercase form.
     *
     * @param rawCode Raw labor type code supplied by the client.
     * @param normalizedCode Normalized code when normalization succeeds.
     * @param validationError Validation detail when normalization fails.
     * @return True when the code is present and was normalized.
     */
    internal static bool TryNormalize(string? rawCode, out string normalizedCode, out string validationError)
    {
        normalizedCode = string.Empty;
        validationError = string.Empty;

        if (string.IsNullOrWhiteSpace(rawCode))
        {
            validationError = "Code is required.";
            return false;
        }

        normalizedCode = rawCode.Trim().ToUpperInvariant();
        return true;
    }
}
