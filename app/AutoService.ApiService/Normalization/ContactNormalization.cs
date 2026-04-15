/**
 * ContactNormalization.cs
 *
 * Centralizes contact-info normalization: email, EU phone numbers, and name validation.
 */

using System.Net.Mail;
using System.Text.RegularExpressions;
using PhoneNumbers;

namespace AutoService.ApiService.Normalization;

/**
 * Provides normalization and validation helpers for contact information fields.
 */
internal static partial class ContactNormalization
{
    private static readonly PhoneNumberUtil PhoneUtil = PhoneNumberUtil.GetInstance();

    /**
     * Country calling codes accepted as valid European numbers.
     * Covers EU member states, EEA, and broader European region.
     */
    private static readonly HashSet<int> EuCountryCodes =
    [
        43, 32, 359, 385, 357, 420, 45, 372, 358, 33, 49, 30, 36, 354, 353, 39,
        371, 423, 370, 352, 356, 31, 47, 48, 351, 40, 421, 386, 34, 46, 44,
        355, 376, 374, 994, 375, 387, 298, 995, 350, 383, 389, 373, 377, 382,
        7, 378, 381, 41, 90, 380, 379
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

    /**
     * Parses and validates a phone number using libphonenumber, ensuring
     * the country code belongs to an accepted European region.
     * @param rawValue Raw user input (any format).
     * @param e164Number E.164 formatted output including '+' prefix.
     * @param defaultRegion ISO 3166-1 alpha-2 default region when input has no country code.
     * @returns {@code true} when the number is a valid European phone number.
     */
    internal static bool TryNormalizeEuPhoneNumber(string? rawValue, out string e164Number, string defaultRegion = "HU")
    {
        e164Number = string.Empty;

        var trimmed = NormalizeOptional(rawValue);
        if (trimmed is null)
        {
            return false;
        }

        try
        {
            var parsed = PhoneUtil.Parse(trimmed, defaultRegion);

            if (!PhoneUtil.IsValidNumber(parsed))
            {
                return false;
            }

            if (!EuCountryCodes.Contains(parsed.CountryCode))
            {
                return false;
            }

            e164Number = PhoneUtil.Format(parsed, PhoneNumberFormat.E164);
            return true;
        }
        catch (NumberParseException)
        {
            return false;
        }
    }

    /**
     * Returns lookup candidates for backward-compatible phone matching:
     * E.164 with '+' prefix and legacy no-plus format.
     * @param e164Number E.164 formatted number (e.g. "+36301234567").
     */
    internal static IReadOnlyCollection<string> BuildPhoneLookupCandidates(string e164Number)
    {
        // e164Number already includes the '+' prefix.
        var noPlusFormat = e164Number[1..];

        return
        [
            e164Number,
            noPlusFormat
        ];
    }
}
