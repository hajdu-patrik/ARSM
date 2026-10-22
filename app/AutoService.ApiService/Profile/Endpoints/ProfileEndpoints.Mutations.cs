using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    /** The validated profile fields a PUT applies: null email or an unchanged phone means "keep". */
    private sealed record ProfileChanges(string? NewEmail, (bool Changed, string? Value) Phone, FullName Name);

    /** Handles PUT profile updates by validating and applying changed contact/name fields to the current person and, when email/phone changed, the linked identity user, inside a single transaction. */
    private static async Task<IResult> UpdateProfileAsync(
        UpdateProfileRequest request,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken, trackChanges: false);
        if (person is null)
        {
            return ApiProblem.NotFound("Linked person record not found.");
        }

        var errors = new Dictionary<string, string[]>();
        var newEmail = await ResolveEmailChangeAsync(request.Email, person, errors, db, cancellationToken);
        var phoneChange = await ResolvePhoneChangeAsync(request.PhoneNumber, person, errors, db, cancellationToken);
        var firstName = ResolveRequiredName(request.FirstName, person.Name.FirstName, "FirstName", ValidationMessages.FirstNameRequired, errors);
        var lastName = ResolveRequiredName(request.LastName, person.Name.LastName, "LastName", ValidationMessages.LastNameRequired, errors);
        var middleName = ResolveMiddleName(request.MiddleName, person.Name.MiddleName, errors);

        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        var changes = new ProfileChanges(newEmail, phoneChange, new FullName(firstName, middleName, lastName));

        try
        {
            return await db.ExecuteInTransactionAsync(
                (transaction, token) => ApplyProfileChangesAsync(person.Id, changes, userManager, db, transaction, token),
                cancellationToken);
        }
        catch (DbUpdateException exception) when (UniqueConstraintDetection.IsUniqueConstraintViolation(exception))
        {
            // The pre-checks above answer 400; this is the race in between, which the unique indexes decide.
            return ApiProblem.Conflict("An account already exists with this email address or phone number.");
        }
    }

    /** The retriable unit: reload the tracked person, apply the changes to it and the identity user, commit. */
    private static async Task<IResult> ApplyProfileChangesAsync(
        int personId,
        ProfileChanges changes,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        var person = await db.People.FirstAsync(p => p.Id == personId, cancellationToken);
        var identityUser = person.IdentityUserId is not null
            ? await userManager.FindByIdAsync(person.IdentityUserId)
            : null;

        person.Email = changes.NewEmail ?? person.Email;
        person.PhoneNumber = changes.Phone.Changed ? changes.Phone.Value : person.PhoneNumber;
        person.Name = changes.Name;

        if (identityUser is not null && (changes.NewEmail is not null || changes.Phone.Changed))
        {
            identityUser.Email = person.Email;
            identityUser.UserName = person.Email;
            identityUser.NormalizedEmail = person.Email.ToUpperInvariant();
            identityUser.NormalizedUserName = person.Email.ToUpperInvariant();
            identityUser.PhoneNumber = person.PhoneNumber;

            var identityUpdateResult = await userManager.UpdateAsync(identityUser);
            if (!identityUpdateResult.Succeeded)
            {
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
