using AutoService.ApiService.Data;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    /**
     * Handles PUT profile updates by validating and applying changed contact/name
     * fields to the current person and, when email/phone changed, the linked
     * identity user, inside a single transaction.
     *
     * @param request Partial profile update payload (only provided fields are validated/applied).
     * @param httpContext Current request context used to resolve the caller's person record.
     * @param userManager Identity user manager.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @return 200 OK with the updated profile, 404 if the person is not linked, or a validation problem.
     */
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
            return Results.Problem(
                detail: "Linked person record not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var errors = new Dictionary<string, string[]>();
        var identityUser = person.IdentityUserId is not null
            ? await userManager.FindByIdAsync(person.IdentityUserId)
            : null;

        var updatedEmail = person.Email;
        var updatedPhoneNumber = person.PhoneNumber;
        var emailChanged = false;
        var phoneChanged = false;

        // Email update.
        if (request.Email is not null)
        {
            if (request.Email.Length > FieldLengthValidator.EmailMaxLength)
            {
                errors["Email"] = [$"Email must be at most {FieldLengthValidator.EmailMaxLength} characters."];
            }
            else if (!ContactNormalization.TryNormalizeEmail(request.Email, out var normalizedEmail))
            {
                errors["Email"] = [ValidationMessages.InvalidEmail];
            }
            else if (!string.Equals(normalizedEmail, person.Email, StringComparison.OrdinalIgnoreCase))
            {
                var emailInUse = await db.People
                    .AnyAsync(p => p.Email == normalizedEmail && p.Id != person.Id, cancellationToken);

                if (emailInUse)
                {
                    errors["Email"] = ["An account already exists with this email address."];
                }
                else
                {
                    updatedEmail = normalizedEmail;
                    emailChanged = true;
                }
            }
        }

        // Phone update.
        if (request.PhoneNumber is not null)
        {
            if (request.PhoneNumber.Length > FieldLengthValidator.PhoneNumberMaxLength)
            {
                errors["PhoneNumber"] = [$"PhoneNumber must be at most {FieldLengthValidator.PhoneNumberMaxLength} characters."];
            }
            else
            {
                var normalizedOptionalPhone = ContactNormalization.NormalizeOptional(request.PhoneNumber);
                if (normalizedOptionalPhone is null)
                {
                    if (person.PhoneNumber is not null)
                    {
                        updatedPhoneNumber = null;
                        phoneChanged = true;
                    }
                }
                else
                {
                    if (!ContactNormalization.TryNormalizeEuPhoneNumber(normalizedOptionalPhone, out var normalizedPhone))
                    {
                        errors["PhoneNumber"] = [ValidationMessages.InvalidPhone];
                    }
                    else
                    {
                        var phoneInUse = await db.People
                            .AnyAsync(p => p.PhoneNumber != null && p.PhoneNumber == normalizedPhone && p.Id != person.Id, cancellationToken);

                        if (phoneInUse)
                        {
                            errors["PhoneNumber"] = ["An account already exists with this phone number."];
                        }
                        else if (!string.Equals(normalizedPhone, person.PhoneNumber, StringComparison.Ordinal))
                        {
                            updatedPhoneNumber = normalizedPhone;
                            phoneChanged = true;
                        }
                    }
                }
            }
        }

        // Name updates: validate provided fields, keep existing values when not provided.
        string firstName = person.Name.FirstName;
        if (request.FirstName is not null)
        {
            if (string.IsNullOrWhiteSpace(request.FirstName))
            {
                errors["FirstName"] = [ValidationMessages.FirstNameRequired];
            }
            else if (request.FirstName.Trim().Length > FieldLengthValidator.NameMaxLength)
            {
                errors["FirstName"] = [$"FirstName must be at most {FieldLengthValidator.NameMaxLength} characters."];
            }
            else
            {
                var nameError = NameFieldsValidator.GetNameError(request.FirstName.Trim(), "FirstName");
                if (nameError is not null) errors["FirstName"] = [nameError];
                else firstName = request.FirstName.Trim();
            }
        }

        string lastName = person.Name.LastName;
        if (request.LastName is not null)
        {
            if (string.IsNullOrWhiteSpace(request.LastName))
            {
                errors["LastName"] = [ValidationMessages.LastNameRequired];
            }
            else if (request.LastName.Trim().Length > FieldLengthValidator.NameMaxLength)
            {
                errors["LastName"] = [$"LastName must be at most {FieldLengthValidator.NameMaxLength} characters."];
            }
            else
            {
                var nameError = NameFieldsValidator.GetNameError(request.LastName.Trim(), "LastName");
                if (nameError is not null) errors["LastName"] = [nameError];
                else lastName = request.LastName.Trim();
            }
        }

        string? middleName = person.Name.MiddleName;
        if (request.MiddleName is not null)
        {
            var trimmed = request.MiddleName.Trim();
            if (string.IsNullOrWhiteSpace(trimmed))
            {
                middleName = null;
            }
            else if (trimmed.Length > FieldLengthValidator.NameMaxLength)
            {
                errors["MiddleName"] = [$"MiddleName must be at most {FieldLengthValidator.NameMaxLength} characters."];
            }
            else
            {
                var nameError = NameFieldsValidator.GetNameError(trimmed, "MiddleName");
                if (nameError is not null) errors["MiddleName"] = [nameError];
                else middleName = trimmed;
            }
        }

        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        person.Email = updatedEmail;
        person.PhoneNumber = updatedPhoneNumber;
        person.Name = new FullName(firstName, middleName, lastName);

        if (identityUser is not null && (emailChanged || phoneChanged))
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

                var identityErrors = identityUpdateResult.Errors
                    .GroupBy(e => string.IsNullOrWhiteSpace(e.Code) ? "identity" : e.Code)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());

                return Results.ValidationProblem(identityErrors);
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
}
