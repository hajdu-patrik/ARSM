using AutoService.ApiService.Normalization;

namespace AutoService.ApiService.Validation;

internal static class NameFieldsValidator
{
    /**
     * Validates first, middle, and last names and adds errors to the provided dictionary.
     * Suitable for dict-based validation patterns (e.g. auth register).
     * Only validates non-empty values; use requireFirstName and requireLastName
     * to control required-field errors.
     *
     * @param firstName First-name input value.
     * @param middleName Middle-name input value.
     * @param lastName Last-name input value.
     * @param errors Target validation error dictionary.
     * @param requireFirstName Whether FirstName is required.
     * @param requireLastName Whether LastName is required.
     */
    internal static void ValidateNames(
        string? firstName,
        string? middleName,
        string? lastName,
        Dictionary<string, string[]> errors,
        bool requireFirstName = false,
        bool requireLastName = false)
    {
        if (requireFirstName && string.IsNullOrWhiteSpace(firstName))
        {
            errors["FirstName"] = [ValidationMessages.FirstNameRequired];
        }
        else if (!string.IsNullOrWhiteSpace(firstName) && !ContactNormalization.IsValidName(firstName.Trim()))
        {
            errors["FirstName"] = [ValidationMessages.InvalidFirstName];
        }

        if (requireLastName && string.IsNullOrWhiteSpace(lastName))
        {
            errors["LastName"] = [ValidationMessages.LastNameRequired];
        }
        else if (!string.IsNullOrWhiteSpace(lastName) && !ContactNormalization.IsValidName(lastName.Trim()))
        {
            errors["LastName"] = [ValidationMessages.InvalidLastName];
        }

        if (!string.IsNullOrWhiteSpace(middleName) && !ContactNormalization.IsValidName(middleName.Trim()))
        {
            errors["MiddleName"] = [ValidationMessages.InvalidMiddleName];
        }
    }

    /**
     * Returns a validation error message for a single name value, or null if valid.
     * Suitable for early-return patterns (e.g. customer create, appointment intake).
     *
     * @param value Name field value to validate.
     * @param fieldName Field identifier used to resolve a specific validation message.
     * @return Validation message when invalid; otherwise null.
     */
    internal static string? GetNameError(string value, string fieldName)
    {
        if (!ContactNormalization.IsValidName(value))
        {
            return fieldName switch
            {
                "FirstName" => ValidationMessages.InvalidFirstName,
                "LastName" => ValidationMessages.InvalidLastName,
                "MiddleName" => ValidationMessages.InvalidMiddleName,
                _ => $"{fieldName} may only contain letters and hyphens."
            };
        }

        return null;
    }
}
