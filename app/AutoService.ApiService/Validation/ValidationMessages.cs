namespace AutoService.ApiService.Validation;

internal static class ValidationMessages
{
    internal const string InvalidFirstName = "First name may only contain letters and hyphens.";
    internal const string InvalidLastName = "Last name may only contain letters and hyphens.";
    internal const string InvalidMiddleName = "Middle name may only contain letters and hyphens.";
    internal const string InvalidEmail = "Email must be a valid email address.";
    internal const string InvalidPhone = "Phone number must be a valid European number.";
    internal const string FirstNameRequired = "First name cannot be empty.";
    internal const string LastNameRequired = "Last name cannot be empty.";
    internal const string InvalidVatRate = "VAT rate must be 0, 5, 18, or 27.";
    internal const string InvalidMoneyAmount = "Amount must be at least 0 and at most 100,000,000.";
    internal const string InvalidQuantity = "Quantity must be greater than 0 and at most 10,000.";
}
