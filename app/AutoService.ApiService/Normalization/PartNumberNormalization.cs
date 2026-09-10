namespace AutoService.ApiService.Normalization;

/**
 * Normalizes part numbers to a trimmed, uppercase canonical form.
 */
internal static class PartNumberNormalization
{
    /**
     * Normalizes a part number to trimmed uppercase form.
     *
     * @param rawPartNumber Raw part number supplied by the client.
     * @param normalizedPartNumber Normalized part number when normalization succeeds.
     * @param validationError Validation detail when normalization fails.
     * @return True when the part number is present and was normalized.
     */
    internal static bool TryNormalize(string? rawPartNumber, out string normalizedPartNumber, out string validationError)
    {
        normalizedPartNumber = string.Empty;
        validationError = string.Empty;

        if (string.IsNullOrWhiteSpace(rawPartNumber))
        {
            validationError = "Part number is required.";
            return false;
        }

        normalizedPartNumber = rawPartNumber.Trim().ToUpperInvariant();
        return true;
    }
}
