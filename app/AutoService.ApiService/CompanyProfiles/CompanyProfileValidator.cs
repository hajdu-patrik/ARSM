using System.Text.RegularExpressions;
using AutoService.ApiService.Configuration;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;

namespace AutoService.ApiService.CompanyProfiles;

/** Validates and normalizes the company profile request; error keys are camelCase field names. */
internal static partial class CompanyProfileValidator
{
    [GeneratedRegex(@"^[0-9]{8}-[0-9]-[0-9]{2}$")]
    private static partial Regex TaxNumberPattern();

    [GeneratedRegex(@"^[0-9]{4}$")]
    private static partial Regex PostalCodePattern();

    /** Returns the normalized profile and the field-keyed errors (empty when valid). */
    internal static (CompanyProfile Profile, Dictionary<string, string[]> Errors) Validate(
        CompanyProfileEndpoints.CompanyProfileDto request)
    {
        var errors = new Dictionary<string, string[]>();

        var name = Text(errors, "name", request.Name, CompanyProfileLimits.NameMaxLength);
        var addressLine = Text(errors, "addressLine", request.AddressLine, CompanyProfileLimits.AddressLineMaxLength);
        var city = Text(errors, "city", request.City, CompanyProfileLimits.CityMaxLength);
        var postalCode = Pattern(errors, "postalCode", request.PostalCode, PostalCodePattern(), "postalCode must be exactly 4 digits.");
        var taxNumber = Pattern(errors, "taxNumber", request.TaxNumber, TaxNumberPattern(), "taxNumber must match the format 12345678-1-12.");
        var phone = Phone(errors, request.PhoneNumber);
        var email = Email(errors, request.Email);

        return (new CompanyProfile(name, addressLine, postalCode, city, taxNumber, phone, email), errors);
    }

    private static string Text(Dictionary<string, string[]> errors, string field, string? raw, int maxLength)
    {
        var value = raw?.Trim() ?? string.Empty;
        if (value.Length == 0)
        {
            errors[field] = [$"{field} cannot be empty."];
        }
        else
        {
            FieldLengthValidator.AddMaxLengthError(errors, field, value, maxLength);
        }

        return value;
    }

    private static string Pattern(Dictionary<string, string[]> errors, string field, string? raw, Regex pattern, string message)
    {
        var value = raw?.Trim() ?? string.Empty;
        if (value.Length == 0)
        {
            errors[field] = [$"{field} cannot be empty."];
        }
        else if (!pattern.IsMatch(value))
        {
            errors[field] = [message];
        }

        return value;
    }

    private static string Phone(Dictionary<string, string[]> errors, string? raw)
    {
        var value = raw?.Trim() ?? string.Empty;
        if (value.Length == 0)
        {
            errors["phoneNumber"] = ["phoneNumber cannot be empty."];
        }
        else if (value.Length > CompanyProfileLimits.PhoneNumberMaxLength)
        {
            errors["phoneNumber"] = [$"phoneNumber must be at most {CompanyProfileLimits.PhoneNumberMaxLength} characters."];
        }
        else if (!ContactNormalization.TryNormalizeEuPhoneNumber(value, out var normalized))
        {
            errors["phoneNumber"] = [ValidationMessages.InvalidPhone];
        }
        else
        {
            return normalized;
        }

        return value;
    }

    private static string Email(Dictionary<string, string[]> errors, string? raw)
    {
        var value = raw?.Trim() ?? string.Empty;
        if (value.Length == 0)
        {
            errors["email"] = ["email cannot be empty."];
        }
        else if (value.Length > CompanyProfileLimits.EmailMaxLength)
        {
            errors["email"] = [$"email must be at most {CompanyProfileLimits.EmailMaxLength} characters."];
        }
        else if (!ContactNormalization.TryNormalizeEmail(value, out var normalized))
        {
            errors["email"] = [ValidationMessages.InvalidEmail];
        }
        else
        {
            return normalized;
        }

        return value;
    }
}
