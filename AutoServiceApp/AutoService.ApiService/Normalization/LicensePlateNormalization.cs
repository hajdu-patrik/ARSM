/**
 * LicensePlateNormalization.cs
 *
 * Auto-generated documentation header for this source file.
 */

using System.Text.RegularExpressions;

namespace AutoService.ApiService.Normalization;

/**
 * Backend type for API logic in this file.
 */
internal static partial class LicensePlateNormalization
{
        internal static bool TryNormalizeEuropeanLicensePlate(
        string rawLicensePlate,
        out string normalizedLicensePlate,
        out string validationError)
    {
        normalizedLicensePlate = string.Empty;
        validationError = string.Empty;

        var trimmed = rawLicensePlate.Trim();
        if (trimmed.Length is < 2 or > 20)
        {
            validationError = "License plate must be between 2 and 20 characters.";
            return false;
        }

        var upperCased = MultiWhitespaceRegex().Replace(trimmed.ToUpperInvariant(), " ");

        if (!EuropeanPlateAllowedCharsRegex().IsMatch(upperCased))
        {
            validationError = "License plate contains unsupported characters. Only European letters, digits, spaces, hyphens, dots, commas, and bullets are allowed.";
            return false;
        }

        foreach (var value in upperCased)
        {
            if (char.IsLetter(value) && !IsSupportedEuropeanLetter(value))
            {
                validationError = "License plate contains non-European letters. Supported scripts are Latin, Greek, and Cyrillic.";
                return false;
            }
        }

        if (!EuropeanPlateBoundaryRegex().IsMatch(upperCased))
        {
            validationError = "License plate must start and end with a letter or digit.";
            return false;
        }

        if (RepeatedSeparatorsRegex().IsMatch(upperCased))
        {
            validationError = "License plate cannot contain repeated separators.";
            return false;
        }

        if (!ContainsDigitRegex().IsMatch(upperCased))
        {
            validationError = "License plate must contain at least one digit.";
            return false;
        }

        normalizedLicensePlate = upperCased;
        return true;
    }

    [GeneratedRegex("\\s+", RegexOptions.CultureInvariant)]
    private static partial Regex MultiWhitespaceRegex();

    [GeneratedRegex("^[\\p{L}\\p{Nd} .,'·•-]+$", RegexOptions.CultureInvariant)]
    private static partial Regex EuropeanPlateAllowedCharsRegex();

    [GeneratedRegex("^[\\p{L}\\p{Nd}](?:[\\p{L}\\p{Nd} .,'·•-]*[\\p{L}\\p{Nd}])?$", RegexOptions.CultureInvariant)]
    private static partial Regex EuropeanPlateBoundaryRegex();

    [GeneratedRegex("[ .,'·•-]{2,}", RegexOptions.CultureInvariant)]
    private static partial Regex RepeatedSeparatorsRegex();

    [GeneratedRegex("\\p{Nd}", RegexOptions.CultureInvariant)]
    private static partial Regex ContainsDigitRegex();

        private static bool IsSupportedEuropeanLetter(char value)
    {
        return IsInRange(value, '\u0041', '\u005A') ||
               IsInRange(value, '\u00C0', '\u00FF') ||
               IsInRange(value, '\u0100', '\u024F') ||
               IsInRange(value, '\u1E00', '\u1EFF') ||
               IsInRange(value, '\u0370', '\u03FF') ||
               IsInRange(value, '\u1F00', '\u1FFF') ||
               IsInRange(value, '\u0400', '\u04FF') ||
               IsInRange(value, '\u0500', '\u052F') ||
               IsInRange(value, '\u1C80', '\u1C8F') ||
               IsInRange(value, '\u2DE0', '\u2DFF') ||
               IsInRange(value, '\uA640', '\uA69F');
    }

    private static bool IsInRange(char value, char minInclusive, char maxInclusive)
        => value >= minInclusive && value <= maxInclusive;
}
