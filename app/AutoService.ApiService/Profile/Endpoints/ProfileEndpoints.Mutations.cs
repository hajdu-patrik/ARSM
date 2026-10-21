using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    /** Handles PUT profile updates by validating and applying changed contact/name fields to the current person and, when email/phone changed, the linked identity user, inside a single transaction. */
    private static async Task<IResult> UpdateProfileAsync(
        UpdateProfileRequest request,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken);
        if (person is null)
        {
            return ApiProblem.NotFound("Linked person record not found.");
        }

        var errors = new Dictionary<string, string[]>();
        var identityUser = person.IdentityUserId is not null
            ? await userManager.FindByIdAsync(person.IdentityUserId)
            : null;

        var newEmail = await ResolveEmailChangeAsync(request.Email, person, errors, db, cancellationToken);
        var phoneChange = await ResolvePhoneChangeAsync(request.PhoneNumber, person, errors, db, cancellationToken);
        var firstName = ResolveRequiredName(request.FirstName, person.Name.FirstName, "FirstName", ValidationMessages.FirstNameRequired, errors);
        var lastName = ResolveRequiredName(request.LastName, person.Name.LastName, "LastName", ValidationMessages.LastNameRequired, errors);
        var middleName = ResolveMiddleName(request.MiddleName, person.Name.MiddleName, errors);

        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        var updatedEmail = newEmail ?? person.Email;
        var updatedPhoneNumber = phoneChange.Changed ? phoneChange.Value : person.PhoneNumber;

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        person.Email = updatedEmail;
        person.PhoneNumber = updatedPhoneNumber;
        person.Name = new FullName(firstName, middleName, lastName);

        if (identityUser is not null && (newEmail is not null || phoneChange.Changed))
        {
            identityUser.Email = updatedEmail;
            identityUser.UserName = updatedEmail;
            identityUser.NormalizedEmail = updatedEmail.ToUpperInvariant();
            identityUser.NormalizedUserName = updatedEmail.ToUpperInvariant();
            identityUser.PhoneNumber = updatedPhoneNumber;

            var identityUpdateResult = await userManager.UpdateAsync(identityUser);
            if (!identityUpdateResult.Succeeded)
            {
                await transaction.RollbackAsync(cancellationToken);

                return Results.ValidationProblem(identityUpdateResult.ToValidationErrors());
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Results.Ok(new ProfileResponse(
            person.Id,
            PersonTypeResolver.Resolve(person),
            person.Name.FirstName,
            person.Name.MiddleName,
            person.Name.LastName,
            person.Email,
            person.PhoneNumber,
            person.ProfilePictureObjectKey is not null || person.ProfilePictureContentType is not null));
    }

    /** The normalized new email when the request changes it, else null; invalid or taken values go into errors. */
    private static async Task<string?> ResolveEmailChangeAsync(
        string? requested,
        People person,
        Dictionary<string, string[]> errors,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (requested is null)
        {
            return null;
        }

        if (requested.Length > FieldLengthValidator.EmailMaxLength)
        {
            errors["Email"] = [$"Email must be at most {FieldLengthValidator.EmailMaxLength} characters."];
            return null;
        }

        if (!ContactNormalization.TryNormalizeEmail(requested, out var normalizedEmail))
        {
            errors["Email"] = [ValidationMessages.InvalidEmail];
            return null;
        }

        if (string.Equals(normalizedEmail, person.Email, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        if (await db.People.AnyAsync(p => p.Email == normalizedEmail && p.Id != person.Id, cancellationToken))
        {
            errors["Email"] = ["An account already exists with this email address."];
            return null;
        }

        return normalizedEmail;
    }

    /** Whether the request changes the phone and to what (null clears it); invalid or taken values go into errors. */
    private static async Task<(bool Changed, string? Value)> ResolvePhoneChangeAsync(
        string? requested,
        People person,
        Dictionary<string, string[]> errors,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (requested is null)
        {
            return (false, null);
        }

        if (requested.Length > FieldLengthValidator.PhoneNumberMaxLength)
        {
            errors["PhoneNumber"] = [$"PhoneNumber must be at most {FieldLengthValidator.PhoneNumberMaxLength} characters."];
            return (false, null);
        }

        var normalizedOptionalPhone = ContactNormalization.NormalizeOptional(requested);
        if (normalizedOptionalPhone is null)
        {
            return (person.PhoneNumber is not null, null);
        }

        if (!ContactNormalization.TryNormalizeEuPhoneNumber(normalizedOptionalPhone, out var normalizedPhone))
        {
            errors["PhoneNumber"] = [ValidationMessages.InvalidPhone];
            return (false, null);
        }

        if (await db.People.AnyAsync(p => p.PhoneNumber != null && p.PhoneNumber == normalizedPhone && p.Id != person.Id, cancellationToken))
        {
            errors["PhoneNumber"] = ["An account already exists with this phone number."];
            return (false, null);
        }

        return (!string.Equals(normalizedPhone, person.PhoneNumber, StringComparison.Ordinal), normalizedPhone);
    }

    /** First or last name: kept when not sent, otherwise required, length-capped and letters-and-hyphens. */
    private static string ResolveRequiredName(
        string? requested,
        string current,
        string fieldName,
        string requiredMessage,
        Dictionary<string, string[]> errors)
    {
        if (requested is null)
        {
            return current;
        }

        if (string.IsNullOrWhiteSpace(requested))
        {
            errors[fieldName] = [requiredMessage];
            return current;
        }

        return ValidateNameValue(requested.Trim(), fieldName, errors) ?? current;
    }

    /** Middle name: kept when not sent, cleared when blank, otherwise length-capped and letters-and-hyphens. */
    private static string? ResolveMiddleName(string? requested, string? current, Dictionary<string, string[]> errors)
    {
        if (requested is null)
        {
            return current;
        }

        var trimmed = requested.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : ValidateNameValue(trimmed, "MiddleName", errors) ?? current;
    }

    /** The trimmed name when it fits the length cap and the letters-and-hyphens rule, else null with the error recorded. */
    private static string? ValidateNameValue(string trimmed, string fieldName, Dictionary<string, string[]> errors)
    {
        if (trimmed.Length > FieldLengthValidator.NameMaxLength)
        {
            errors[fieldName] = [$"{fieldName} must be at most {FieldLengthValidator.NameMaxLength} characters."];
            return null;
        }

        var nameError = NameFieldsValidator.GetNameError(trimmed, fieldName);
        if (nameError is not null)
        {
            errors[fieldName] = [nameError];
            return null;
        }

        return trimmed;
    }
}
