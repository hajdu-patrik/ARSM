using AutoService.ApiService.Identity;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AutoService.ApiService.Auth.Endpoints;

/**
 * Partial class containing the registration endpoint handler and its supporting helpers.
 */
public static partial class AuthEndpoints
{
    /**
     * Handles POST /api/auth/register and creates a mechanic account.
     * Identity and domain records are persisted in one transaction.
     *
     * @param request Incoming registration payload.
     * @param httpContext Current request context used for client metadata.
     * @param userManager Identity user manager.
     * @param db Database context.
     * @param loggerFactory Logger factory used to create endpoint logger.
     * @param cancellationToken Request cancellation token.
     * @return 200 OK with IDs on success, or validation/conflict result when registration fails.
     */
    private static async Task<IResult> RegisterAsync(
        RegisterRequest request,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AuthEndpoints.Register");
        var clientIp = ResolveClientIpAddress(httpContext);

        var validationErrors = ValidateRegisterRequest(request);
        if (validationErrors.Count > 0)
        {
            logger.LogWarning("Registration validation failed with {ErrorCount} errors.", validationErrors.Count);
            return Results.ValidationProblem(validationErrors);
        }

        _ = TryNormalizeEmail(request.Email, out var email);
        var phoneNumber = NormalizeOptional(request.PhoneNumber) is null
            ? null
            : TryNormalizeEuPhoneNumber(request.PhoneNumber, out var normalizedPhone)
                ? normalizedPhone
                : null;

        if (await userManager.FindByEmailAsync(email) is not null)
        {
            logger.LogInformation("Registration rejected: email already exists in Identity.");
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(request.Email)] = ["An account already exists with this email address."]
            });
        }

        var peopleEmailInUse = await db.People
            .AsNoTracking()
            .AnyAsync(p => p.Email == email, cancellationToken);

        if (peopleEmailInUse)
        {
            logger.LogInformation("Registration rejected: email already exists in People records.");
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(request.Email)] = ["An account already exists with this email address."]
            });
        }

        if (!string.IsNullOrWhiteSpace(phoneNumber))
        {
            var phoneLookupCandidates = BuildPhoneLookupCandidates(phoneNumber);
            var phoneNumberInUse = await userManager.Users
                .AnyAsync(x => x.PhoneNumber != null && phoneLookupCandidates.Contains(x.PhoneNumber.Trim()), cancellationToken);

            if (!phoneNumberInUse)
            {
                phoneNumberInUse = await db.People
                    .AsNoTracking()
                    .AnyAsync(p => p.PhoneNumber != null && phoneLookupCandidates.Contains(p.PhoneNumber), cancellationToken);
            }

            if (phoneNumberInUse)
            {
                logger.LogInformation("Registration rejected: phone number already exists.");
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
            logger.LogWarning("Registration failed while creating identity user. ErrorCount: {ErrorCount}.", createUserResult.Errors.Count());
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
            logger.LogWarning("Registration failed due to out-of-range input for {ParamName}.", exception.ParamName ?? "register");
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                [exception.ParamName ?? "register"] = [exception.Message]
            });
        }
        catch (ArgumentException exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            logger.LogWarning("Registration failed due to invalid input for {ParamName}.", exception.ParamName ?? "register");
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

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            await transaction.RollbackAsync(cancellationToken);
            logger.LogInformation("Registration failed due to unique constraint conflict on persisted data.");
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(request.Email)] = ["An account already exists with this email address."]
            });
        }

        logger.LogInformation("Registration succeeded for person {PersonId} linked to identity user {IdentityUserId}. ClientIp: {ClientIp}.", person.Id, identityUser.Id, clientIp);
        return Results.Ok(new RegisterResponse(person.Id, PersonTypeResolver.Resolve(person), person.Email));
    }

    /**
     * Validates required and mechanic-specific registration fields.
     *
     * @param request Incoming registration payload.
     * @return Field-level validation errors keyed by request property name.
     */
    private static Dictionary<string, string[]> ValidateRegisterRequest(RegisterRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        AddRequired(errors, nameof(request.PersonType), request.PersonType);
        AddRequired(errors, nameof(request.FirstName), request.FirstName);
        AddRequired(errors, nameof(request.LastName), request.LastName);
        AddRequired(errors, nameof(request.Email), request.Email);
        AddRequired(errors, nameof(request.Password), request.Password);

        NameFieldsValidator.ValidateNames(request.FirstName, request.MiddleName, request.LastName, errors);

        if (!string.IsNullOrWhiteSpace(request.Email) && !TryNormalizeEmail(request.Email, out _))
        {
            errors[nameof(request.Email)] = [ValidationMessages.InvalidEmail];
        }

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber) && !TryNormalizeEuPhoneNumber(request.PhoneNumber, out _))
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
            else if (request.Expertise.Count > 10)
            {
                errors[nameof(request.Expertise)] = ["Mechanic expertise may contain at most 10 items."];
            }
            else if (request.Expertise.Count != request.Expertise.Distinct(StringComparer.OrdinalIgnoreCase).Count())
            {
                errors[nameof(request.Expertise)] = ["Mechanic expertise items must be unique."];
            }
        }

        return errors;
    }

    /**
     * Creates a domain entity from the registration payload.
     * Only mechanics are allowed for public registration.
     *
     * @param request Validated registration payload.
     * @param identityUserId Linked identity user ID.
     * @param email Normalized email address.
     * @param phoneNumber Normalized optional phone number.
     * @return A mechanic domain entity linked to the identity user.
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
     * Parses expertise strings to ExpertiseType values.
     *
     * @param expertiseValues Raw expertise values from request payload.
     * @return Parsed expertise enum list.
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

    /**
     * Determines whether a database update failed due to a unique key constraint.
     *
     * @param exception The thrown EF update exception.
     * @return true when a nested PostgreSQL unique violation is found; otherwise false.
     */
    private static bool IsUniqueConstraintViolation(DbUpdateException exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                return true;
            }
        }

        return false;
    }
}