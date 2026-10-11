using AutoService.ApiService.Configuration;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;

namespace AutoService.ApiService.DataInitialization;

/** Raw `Bootstrap:Admin` configuration for the first-admin bootstrap; bound as-is, validated by Validate. */
internal sealed class AdminBootstrapSettings
{
    internal const string SectionPath = "Bootstrap:Admin";

    public string? Email { get; set; }
    public string? Password { get; set; }
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Specialization { get; set; }
    public string[]? Expertise { get; set; }

    /** Applies the mechanic registration rules; returns the invalid field names (never their values). */
    internal List<string> Validate(out AdminBootstrapRequest? request)
    {
        request = null;
        var errors = new Dictionary<string, string[]>();

        RequireValue(errors, nameof(FirstName), FirstName);
        RequireValue(errors, nameof(LastName), LastName);
        RequireValue(errors, nameof(Password), Password);
        NameFieldsValidator.ValidateNames(FirstName, MiddleName, LastName, errors);

        if (!ContactNormalization.TryNormalizeEmail(Email, out var email))
        {
            errors[nameof(Email)] = [ValidationMessages.InvalidEmail];
        }

        string? phoneNumber = null;
        if (ContactNormalization.NormalizeOptional(PhoneNumber) is not null &&
            !ContactNormalization.TryNormalizeEuPhoneNumber(PhoneNumber, out phoneNumber))
        {
            errors[nameof(PhoneNumber)] = [ValidationMessages.InvalidPhone];
        }

        if (!Enum.TryParse<SpecializationType>(Specialization?.Trim(), true, out var specialization) ||
            !Enum.IsDefined(specialization))
        {
            errors[nameof(Specialization)] = ["Specialization is missing or invalid."];
        }

        var expertise = ParseExpertise(errors);

        if (Password is not null && TemplateMarkerDetector.ContainsTemplateMarker(Password))
        {
            errors[nameof(Password)] = ["Password still contains a template placeholder marker."];
        }

        FieldLengthValidator.AddMaxLengthError(errors, nameof(FirstName), FirstName?.Trim(), FieldLengthValidator.NameMaxLength);
        FieldLengthValidator.AddMaxLengthError(errors, nameof(MiddleName), MiddleName?.Trim(), FieldLengthValidator.NameMaxLength);
        FieldLengthValidator.AddMaxLengthError(errors, nameof(LastName), LastName?.Trim(), FieldLengthValidator.NameMaxLength);
        FieldLengthValidator.AddMaxLengthError(errors, nameof(Email), Email, FieldLengthValidator.EmailMaxLength);
        FieldLengthValidator.AddMaxLengthError(errors, nameof(Password), Password, FieldLengthValidator.PasswordMaxLength);
        FieldLengthValidator.AddMaxLengthError(errors, nameof(PhoneNumber), PhoneNumber, FieldLengthValidator.PhoneNumberMaxLength);

        if (errors.Count > 0)
        {
            return [.. errors.Keys];
        }

        var fullName = new FullName(FirstName!.Trim(), ContactNormalization.NormalizeOptional(MiddleName), LastName!.Trim());
        request = new AdminBootstrapRequest(fullName, email, Password!, phoneNumber, specialization, expertise);
        return [];
    }

    /** Parses the 1..10 unique expertise items the Mechanic entity requires. */
    private List<ExpertiseType> ParseExpertise(Dictionary<string, string[]> errors)
    {
        var values = (Expertise ?? []).Where(static value => !string.IsNullOrWhiteSpace(value)).ToList();
        var parsed = new List<ExpertiseType>();

        foreach (var value in values)
        {
            if (!Enum.TryParse<ExpertiseType>(value.Trim(), true, out var item) || !Enum.IsDefined(item))
            {
                errors[nameof(Expertise)] = ["Expertise contains an invalid value."];
                return [];
            }

            parsed.Add(item);
        }

        if (parsed.Count is < 1 or > 10 || parsed.Distinct().Count() != parsed.Count)
        {
            errors[nameof(Expertise)] = ["Expertise requires 1 to 10 unique items."];
        }

        return parsed;
    }

    private static void RequireValue(Dictionary<string, string[]> errors, string key, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[key] = [$"{key} is required."];
        }
    }
}

/** Validated, normalized first-admin data ready for persistence. */
internal sealed record AdminBootstrapRequest(
    FullName Name,
    string Email,
    string Password,
    string? PhoneNumber,
    SpecializationType Specialization,
    List<ExpertiseType> Expertise);
