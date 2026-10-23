using System.Text;
using System.Text.RegularExpressions;

namespace AutoService.ApiService.Email.Sending;

/** Defence in depth: subject and recipient end up in RFC 5322 headers, so a CR/LF that slipped
    past the templates must never add a header or a recipient. */
public static class EmailHeaderSanitizer
{
    public const int MaxSubjectCodePoints = 250;

    private const string Ellipsis = "\u2026";

    // One bare address: no display name, list separator, whitespace or control character, one at sign.
    private static readonly Regex SingleAddress = new(
        @"^[^\s@,;<>()""\\\x00-\x1F\x7F]{1,64}@[^\s@,;<>()""\\\x00-\x1F\x7F]{1,255}\z",
        RegexOptions.CultureInvariant | RegexOptions.Compiled);

    /** One header-safe line, cut by code points so a surrogate pair is never split. */
    public static string SanitizeSubject(string subject)
    {
        var collapsed = CollapseToSingleLine(subject);
        var codePoints = 0;
        var cutIndex = 0;
        var index = 0;

        foreach (var rune in collapsed.EnumerateRunes())
        {
            if (codePoints == MaxSubjectCodePoints - 1)
            {
                cutIndex = index;
            }

            codePoints++;
            index += rune.Utf16SequenceLength;
        }

        return codePoints <= MaxSubjectCodePoints
            ? collapsed
            : collapsed[..cutIndex].TrimEnd() + Ellipsis;
    }

    public static bool IsSingleAddress(string address) => SingleAddress.IsMatch(address);

    /** Replaces control characters and line separators with a space and collapses whitespace runs. */
    private static string CollapseToSingleLine(string value)
    {
        var builder = new StringBuilder(value.Length);
        var pendingSpace = false;

        foreach (var c in value)
        {
            if (char.IsControl(c) || c is '\u2028' or '\u2029' || char.IsWhiteSpace(c))
            {
                pendingSpace = builder.Length > 0;
                continue;
            }

            if (pendingSpace)
            {
                builder.Append(' ');
                pendingSpace = false;
            }

            builder.Append(c);
        }

        return builder.ToString();
    }
}
