using AutoService.ApiService.Common;
using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using AutoService.ApiService.Models.UniqueTypes;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Auth;

public static partial class AuthEndpoints
{
    /**
     * Handles POST /api/auth/register.
     * Creates an ASP.NET Core Identity account and a linked Mechanic domain record
     * inside a single database transaction. Rolls back both if either step fails.
     *
     * @param request Registration payload (mechanic only).
     * @param userManager ASP.NET Core Identity user manager.
     * @param db Entity Framework Core database context.
     * @param cancellationToken Cancellation token for the async operation.
     * @return 200 OK with identity+domain IDs, or 422 Unprocessable with validation errors.
     */
    private static async Task<IResult> RegisterAsync(
        RegisterRequest request,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var validationErrors = ValidateRegisterRequest(request);
        if (validationErrors.Count > 0)
        {
            return Results.ValidationProblem(validationErrors);
        }

        _ = TryNormalizeEmail(request.Email, out var email);
        var phoneNumber = NormalizeOptional(request.PhoneNumber) is null
            ? null
            : TryNormalizeHungarianPhoneNumber(request.PhoneNumber, out var normalizedPhone)
                ? normalizedPhone
                : null;

        if (await userManager.FindByEmailAsync(email) is not null)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(request.Email)] = ["An account already exists with this email address."]
            });
        }

        if (!string.IsNullOrWhiteSpace(phoneNumber))
        {
            var phoneLookupCandidates = BuildHungarianPhoneLookupCandidates(phoneNumber);
            var phoneNumberInUse = await userManager.Users
                .AnyAsync(x => x.PhoneNumber != null && phoneLookupCandidates.Contains(x.PhoneNumber.Trim()), cancellationToken);

            if (phoneNumberInUse)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    [nameof(request.PhoneNumber)] = ["An account already exists with this phone number."]
                });
            }
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var identityUser = new IdentityUser
        {
            UserName = email,
            Email = email,
            PhoneNumber = phoneNumber
        };

        var createUserResult = await userManager.CreateAsync(identityUser, request.Password);
        if (!createUserResult.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);
            return Results.ValidationProblem(ToValidationErrors(createUserResult));
        }

        People person;

        try
        {
            person = CreatePerson(request, identityUser.Id, email, phoneNumber);
        }
        catch (ArgumentOutOfRangeException exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                [exception.ParamName ?? "register"] = [exception.Message]
            });
        }
        catch (ArgumentException exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                [exception.ParamName ?? "register"] = [exception.Message]
            });
        }

        switch (person)
        {
            case Customer customer:
                db.Customers.Add(customer);
                break;
            case Mechanic mechanic:
                db.Mechanics.Add(mechanic);
                break;
        }

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Results.Ok(new RegisterResponse(identityUser.Id, person.Id, GetPersonType(person), person.Email));
    }

    /**
     * Validates all required and mechanic-specific fields in a register request.
     *
     * @param request The incoming registration payload.
     * @return A dictionary of field-level error messages; empty if valid.
     */
    private static Dictionary<string, string[]> ValidateRegisterRequest(RegisterRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        AddRequired(errors, nameof(request.PersonType), request.PersonType);
        AddRequired(errors, nameof(request.FirstName), request.FirstName);
        AddRequired(errors, nameof(request.LastName), request.LastName);
        AddRequired(errors, nameof(request.Email), request.Email);
        AddRequired(errors, nameof(request.Password), request.Password);

        if (!string.IsNullOrWhiteSpace(request.FirstName) && !ContactNormalization.IsValidName(request.FirstName.Trim()))
        {
            errors[nameof(request.FirstName)] = [ValidationMessages.InvalidFirstName];
        }

        if (!string.IsNullOrWhiteSpace(request.LastName) && !ContactNormalization.IsValidName(request.LastName.Trim()))
        {
            errors[nameof(request.LastName)] = [ValidationMessages.InvalidLastName];
        }

        if (!string.IsNullOrWhiteSpace(request.MiddleName) && !ContactNormalization.IsValidName(request.MiddleName.Trim()))
        {
            errors[nameof(request.MiddleName)] = [ValidationMessages.InvalidMiddleName];
        }

        if (!string.IsNullOrWhiteSpace(request.Email) && !TryNormalizeEmail(request.Email, out _))
        {
            errors[nameof(request.Email)] = [ValidationMessages.InvalidEmail];
        }

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber) && !TryNormalizeHungarianPhoneNumber(request.PhoneNumber, out _))
        {
            errors[nameof(request.PhoneNumber)] = [ValidationMessages.InvalidPhone];
        }

        var isMechanic = string.Equals(request.PersonType, "mechanic", StringComparison.OrdinalIgnoreCase);

        if (!string.IsNullOrWhiteSpace(request.PersonType) && !isMechanic)
        {
            // Only mechanics can register — customers are managed internally by mechanics.
            errors[nameof(request.PersonType)] = ["Registration is only available for mechanics."];
        }

        if (isMechanic)
        {
            AddRequired(errors, nameof(request.Specialization), request.Specialization);

            if (request.Expertise is null || request.Expertise.Count == 0)
            {
                errors[nameof(request.Expertise)] = ["Mechanic registration requires at least one expertise item."];
            }
            else if (request.Expertise.Count != request.Expertise.Distinct(StringComparer.OrdinalIgnoreCase).Count())
            {
                errors[nameof(request.Expertise)] = ["Mechanic expertise items must be unique."];
            }
        }

        return errors;
    }

    /**
     * Factory method that constructs the correct domain entity from the register request.
     * Only Mechanic is supported; an ArgumentException is thrown for any other PersonType.
     *
     * @param request The validated registration payload.
     * @param identityUserId The Identity user ID to link to the domain record.
     * @param email Normalised email address.
     * @param phoneNumber Normalised optional phone number.
     * @return A new Mechanic entity ready to be persisted.
     */
    private static People CreatePerson(RegisterRequest request, string identityUserId, string email, string? phoneNumber)
    {
        var fullName = new FullName(request.FirstName.Trim(), NormalizeOptional(request.MiddleName), request.LastName.Trim());

        if (!string.Equals(request.PersonType, "mechanic", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Registration is only available for mechanics.", nameof(request.PersonType));
        }

        if (!Enum.TryParse<SpecializationType>(request.Specialization, true, out var specialization))
        {
            throw new ArgumentException("Specialization is invalid.", nameof(request.Specialization));
        }

        var expertise = ParseExpertise(request.Expertise ?? []);

        return new Mechanic(fullName, email, phoneNumber, specialization, expertise)
        {
            IdentityUserId = identityUserId
        };
    }

    /**
     * Parses and validates a list of expertise string values into ExpertiseType enum values.
     * Throws ArgumentException if any value does not match a known enum member.
     *
     * @param expertiseValues Raw string values from the registration request.
     * @return A list of parsed ExpertiseType enum values.
     */
    private static List<ExpertiseType> ParseExpertise(IReadOnlyCollection<string> expertiseValues)
    {
        var expertise = new List<ExpertiseType>();

        foreach (var expertiseValue in expertiseValues)
        {
            if (!Enum.TryParse<ExpertiseType>(expertiseValue, true, out var parsedValue))
            {
                throw new ArgumentException($"Expertise value '{expertiseValue}' is invalid.", nameof(expertiseValues));
            }

            expertise.Add(parsedValue);
        }

        return expertise;
    }
}