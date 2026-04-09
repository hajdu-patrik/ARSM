using System.Net.Mail;
using System.Text.RegularExpressions;

namespace AutoService.ApiService.Common;

internal static partial class ContactNormalization
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

    private static readonly Regex NamePattern = new(@"^[\p{L}\-]+$", RegexOptions.Compiled);

    internal static bool IsValidName(string name) => NamePattern.IsMatch(name);

    internal static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    internal static bool TryNormalizeEmail(string? rawValue, out string normalizedEmail)
    {
        normalizedEmail = string.Empty;

        var trimmed = NormalizeOptional(rawValue);
        if (trimmed is null)
        {
            return false;
        }

        var lowerCased = trimmed.ToLowerInvariant();

        try
        {
            var parsed = new MailAddress(lowerCased);
            if (!string.Equals(parsed.Address, lowerCased, StringComparison.Ordinal))
            {
                return false;
            }
        }
        catch
        {
            return false;
        }

        normalizedEmail = lowerCased;
        return true;
    }

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
            if (!IsValidHungarianNationalNumber(candidate))
            {
                return false;
            }

            candidate = $"36{candidate}";
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

    internal static IReadOnlyCollection<string> BuildHungarianPhoneLookupCandidates(string normalizedPhoneNumber)
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
        if (nationalNumber.StartsWith("1", StringComparison.Ordinal))
        {
            return nationalNumber.Length == 8;
        }

        if (nationalNumber.Length < 8)
        {
            return false;
        }

        var twoDigitPrefix = nationalNumber[..2];

        if (AllowedHungarianMobilePrefixes.Contains(twoDigitPrefix))
        {
            return nationalNumber.Length == 9;
        }

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
