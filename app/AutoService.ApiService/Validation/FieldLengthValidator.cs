namespace AutoService.ApiService.Validation;

/** Validates field lengths against DB column caps (or the password cap) and adds "at most N characters" errors to the caller's dict-based validation errors. */
internal static class FieldLengthValidator
{
    internal const int EmailMaxLength = 150;
    internal const int NameMaxLength = 50;
    internal const int PhoneNumberMaxLength = 20;
    internal const int PasswordMaxLength = 128;

    /** Adds an "at most N characters" error when value exceeds maxLength; no-op if null/within limit or fieldName already has an error. */
    internal static void AddMaxLengthError(
        Dictionary<string, string[]> errors,
        string fieldName,
        string? value,
        int maxLength)
    {
        if (value is not null && value.Length > maxLength && !errors.ContainsKey(fieldName))
        {
            errors[fieldName] = [$"{fieldName} must be at most {maxLength} characters."];
        }
    }
}
