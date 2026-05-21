using System.Text.RegularExpressions;

namespace AutoService.ApiService.Normalization;

/**
 * Provides conservative structural VIN normalization and validation.
 */
internal static partial class VinNormalization
{
    internal const int VinLength = 17;

    /**
     * Normalizes a VIN to uppercase and validates the structural 17-character form.
     *
     * @param rawVin Raw VIN supplied by the client.
     * @param normalizedVin Uppercase VIN when validation succeeds.
     * @param validationError Validation detail when validation fails.
     * @return True when the VIN is structurally valid.
     */
    internal static bool TryNormalizeVin(string? rawVin, out string normalizedVin, out string validationError)
    {
        normalizedVin = string.Empty;
        validationError = string.Empty;

        if (string.IsNullOrWhiteSpace(rawVin))
        {
            validationError = "VIN is required.";
            return false;
        }

        var upperCased = rawVin.Trim().ToUpperInvariant();
        if (upperCased.Length != VinLength)
        {
            validationError = $"VIN must be exactly {VinLength} characters.";
            return false;
        }

        if (!StructuralVinRegex().IsMatch(upperCased))
        {
            validationError = "VIN may only contain digits and uppercase letters A-H, J-N, P, and R-Z.";
            return false;
        }

        normalizedVin = upperCased;
        return true;
    }

    [GeneratedRegex("^[A-HJ-NPR-Z0-9]{17}$", RegexOptions.CultureInvariant)]
    private static partial Regex StructuralVinRegex();
}
