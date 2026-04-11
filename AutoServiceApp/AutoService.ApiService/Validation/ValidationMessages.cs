namespace AutoService.ApiService.Validation;

internal static class ValidationMessages
{
    internal const string InvalidFirstName = "First name may only contain letters and hyphens.";
    internal const string InvalidLastName = "Last name may only contain letters and hyphens.";
    internal const string InvalidMiddleName = "Middle name may only contain letters and hyphens.";
    internal const string InvalidEmail = "Email must be a valid email address.";
    internal const string InvalidPhone = "Phone number must be a valid Hungarian number.";
    internal const string FirstNameRequired = "First name cannot be empty.";
    internal const string LastNameRequired = "Last name cannot be empty.";
}
