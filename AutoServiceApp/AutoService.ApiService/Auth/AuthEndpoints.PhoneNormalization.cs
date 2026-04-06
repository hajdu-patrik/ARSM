using System.Text.RegularExpressions;

namespace AutoService.ApiService.Auth;

public static partial class AuthEndpoints
{
    private static readonly HashSet<string> AllowedHungarianMobilePrefixes =
    [
        "20", "21", "30", "31", "50", "70"
    ];

    private static readonly HashSet<string> AllowedHungarianGeographicPrefixes =
    [
        "22", "23", "24", "25", "26", "27", "28", "29",
        "32", "33", "34", "35", "36", "37",
        "42", "44", "45", "46", "47", "48", "49",
        "52", "53", "54", "56", "57", "59",
        "62", "63", "66", "68", "69",
        "72", "73", "74", "75", "76", "77", "78", "79",
        "82", "83", "84", "85", "87", "88", "89",
        "92", "93", "94", "95", "96", "99"
    ];

    internal static bool TryNormalizeHungarianPhoneNumber(string? rawValue, out string normalizedPhoneNumber)
    {
        normalizedPhoneNumber = string.Empty;

        var trimmed = NormalizeOptional(rawValue);
        if (trimmed is null)
        {
            return false;
        }

        var digitsOnly = NonDigitRegex().Replace(trimmed, string.Empty);
        if (string.IsNullOrEmpty(digitsOnly))
        {
            return false;
        }

        var candidate = digitsOnly;

        if (candidate.StartsWith("00", StringComparison.Ordinal))
        {
            candidate = candidate[2..];
        }

        if (candidate.StartsWith("06", StringComparison.Ordinal))
        {
            candidate = $"36{candidate[2..]}";
        }

        if (!candidate.StartsWith("36", StringComparison.Ordinal))
        {
            return false;
        }

        var nationalNumber = candidate[2..];
        if (!AllDigitsRegex().IsMatch(nationalNumber))
        {
            return false;
        }

        if (!IsValidHungarianNationalNumber(nationalNumber))
        {
            return false;
        }

        normalizedPhoneNumber = $"36{nationalNumber}";
        return true;
    }

    private static IReadOnlyCollection<string> BuildHungarianPhoneLookupCandidates(string normalizedPhoneNumber)
    {
        var nationalNumber = normalizedPhoneNumber[2..];

        return
        [
            normalizedPhoneNumber,
            $"+{normalizedPhoneNumber}",
            $"06{nationalNumber}"
        ];
    }

    private static bool IsValidHungarianNationalNumber(string nationalNumber)
    {
        // Budapest landline: 1 + 7 subscriber digits.
        if (nationalNumber.StartsWith("1", StringComparison.Ordinal))
        {
            return nationalNumber.Length == 8;
        }

        if (nationalNumber.Length < 8)
        {
            return false;
        }

        var twoDigitPrefix = nationalNumber[..2];

        // Mobile/nomadic ranges: 2-digit prefix + 7 subscriber digits.
        if (AllowedHungarianMobilePrefixes.Contains(twoDigitPrefix))
        {
            return nationalNumber.Length == 9;
        }

        // Geographic ranges: 2-digit area code + 6 subscriber digits.
        if (AllowedHungarianGeographicPrefixes.Contains(twoDigitPrefix))
        {
            return nationalNumber.Length == 8;
        }

        return false;
    }

    [GeneratedRegex("\\D", RegexOptions.CultureInvariant)]
    private static partial Regex NonDigitRegex();

    [GeneratedRegex("^\\d+$", RegexOptions.CultureInvariant)]
    private static partial Regex AllDigitsRegex();
}
