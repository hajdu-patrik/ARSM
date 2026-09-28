using AutoService.ApiService.Normalization;

namespace AutoService.ApiService.Validation;

internal static class NameFieldsValidator
{
    /** Validates first/middle/last names into the errors dict; only validates non-empty values, requireFirstName/requireLastName control required-field errors. */
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
