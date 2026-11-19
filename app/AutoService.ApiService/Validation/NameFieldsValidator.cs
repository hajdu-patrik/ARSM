using AutoService.ApiService.Normalization;

namespace AutoService.ApiService.Validation;

/** Validates person name fields and maps each failure to its shared validation message. */
internal static class NameFieldsValidator
{
    /** Validates the non-empty first/middle/last names into the errors dict; empty values are not an error here. */
    internal static void ValidateNames(
        string? firstName,
        string? middleName,
        string? lastName,
        Dictionary<string, string[]> errors)
    {
        AddErrorWhenInvalid(firstName, "FirstName", ValidationMessages.InvalidFirstName, errors);
        AddErrorWhenInvalid(lastName, "LastName", ValidationMessages.InvalidLastName, errors);
        AddErrorWhenInvalid(middleName, "MiddleName", ValidationMessages.InvalidMiddleName, errors);
    }

    private static void AddErrorWhenInvalid(string? value, string field, string message, Dictionary<string, string[]> errors)
    {
        if (!string.IsNullOrWhiteSpace(value) && !ContactNormalization.IsValidName(value.Trim()))
        {
            errors[field] = [message];
        }
    }

    /** Returns a validation error message for a single name value, or null if valid (early-return patterns). */
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
