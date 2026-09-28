namespace AutoService.ApiService.Normalization;

/** Normalizes labor type codes to a trimmed, uppercase canonical form. */
internal static class LaborTypeCodeNormalization
{
    /** Normalizes a labor type code to trimmed uppercase form. */
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
