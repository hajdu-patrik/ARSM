namespace AutoService.ApiService.Validation;

/**
 * Validates request field lengths against the People DB column caps (Email, FirstName,
 * MiddleName, LastName, PhoneNumber) or the product-decided password cap, and adds
 * "must be at most N characters" errors to the caller's dict-based validation errors.
 * Suitable for dict-based validation patterns (e.g. auth login/register, profile update/change-password).
 */
internal static class FieldLengthValidator
{
    internal const int EmailMaxLength = 150;
    internal const int NameMaxLength = 50;
    internal const int PhoneNumberMaxLength = 20;
    internal const int PasswordMaxLength = 128;

    /**
     * Adds a "must be at most N characters" error for value when it exceeds maxLength.
     * No-op when value is null or already within the limit; does not overwrite an
     * existing error already recorded for fieldName.
     *
     * @param errors Target validation error dictionary.
     * @param fieldName Field identifier used as the error dictionary key.
     * @param value Field input value; null values are ignored.
     * @param maxLength Maximum allowed character length.
     */
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
