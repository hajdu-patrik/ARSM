using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Customers;

/** The fields customer create and update share, with the checks both run in the same order. */
internal readonly record struct CustomerInput(
    string FirstName,
    string? MiddleName,
    string LastName,
    string Email,
    string? PhoneNumber)
{
    /** Required fields (names and email) first, then the first, last and (when given) middle name. */
    internal string? GetFieldError()
    {
        if (string.IsNullOrWhiteSpace(FirstName) ||
            string.IsNullOrWhiteSpace(LastName) ||
            string.IsNullOrWhiteSpace(Email))
        {
            return "FirstName, LastName, and Email are required.";
        }

        return NameFieldsValidator.GetNameError(FirstName.Trim(), "FirstName")
            ?? NameFieldsValidator.GetNameError(LastName.Trim(), "LastName")
            ?? (string.IsNullOrWhiteSpace(MiddleName) ? null : NameFieldsValidator.GetNameError(MiddleName.Trim(), "MiddleName"));
    }

    /** Normalizes the email, then the optional phone; returns the 422 detail of the first invalid one. */
    internal string? NormalizeContact(out string normalizedEmail, out string? normalizedPhone)
    {
        normalizedPhone = null;
        if (!ContactNormalization.TryNormalizeEmail(Email, out normalizedEmail))
        {
            return ValidationMessages.InvalidEmail;
        }

        normalizedPhone = ContactNormalization.NormalizeOptional(PhoneNumber);
        return normalizedPhone is not null && !ContactNormalization.TryNormalizeEuPhoneNumber(normalizedPhone, out normalizedPhone)
            ? ValidationMessages.InvalidPhone
            : null;
    }

    internal FullName ToFullName() => new(FirstName.Trim(), MiddleName?.Trim(), LastName.Trim());

    /** The 409 detail when another person already holds the email or, checked second, the phone. */
    internal static async Task<string?> FindContactConflictAsync(
        AutoServiceDbContext db,
        string normalizedEmail,
        string? normalizedPhone,
        int? excludePersonId,
        CancellationToken cancellationToken)
    {
        IQueryable<People> others = db.People;
        if (excludePersonId is int id)
        {
            others = others.Where(p => p.Id != id);
        }

        if (await others.AnyAsync(p => p.Email == normalizedEmail, cancellationToken))
        {
            return "A person with this email already exists.";
        }

        return normalizedPhone is not null && await others.AnyAsync(p => p.PhoneNumber == normalizedPhone, cancellationToken)
            ? "A person with this phone number already exists."
            : null;
    }
}
