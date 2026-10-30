namespace AutoService.ApiService.Validation;

/** Parses enum names from DTO strings, rejecting numeric, comma-listed and undefined input. */
internal static class DefinedEnum
{
    /** True only for a letters-only text naming a defined member, case-insensitively. */
    internal static bool TryParse<TEnum>(string? rawValue, out TEnum value) where TEnum : struct, Enum
    {
        value = default;
        var text = rawValue?.Trim();
        return !string.IsNullOrEmpty(text)
            && text.All(char.IsLetter)
            && Enum.TryParse(text, ignoreCase: true, out value)
            && Enum.IsDefined(value);
    }
}
