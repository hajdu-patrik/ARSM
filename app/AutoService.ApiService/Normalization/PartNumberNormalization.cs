namespace AutoService.ApiService.Normalization;

/** Normalizes part numbers to a trimmed, uppercase canonical form. */
internal static class PartNumberNormalization
{
    /** Normalizes a part number to trimmed uppercase form. */
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
