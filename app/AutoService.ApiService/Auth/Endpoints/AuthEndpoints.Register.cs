using AutoService.ApiService.Identity;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace AutoService.ApiService.Auth.Endpoints;

public static partial class AuthEndpoints
{
    private const string GenericRegistrationFailureMessage = "Registration failed. Please check your information, or the account may already exist.";

    /** Handles POST /api/auth/register and creates a mechanic account. Identity and domain records are persisted in one transaction. */
    private static async Task<IResult> RegisterAsync(
        RegisterRequest request,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        IServiceScopeFactory scopeFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AuthEndpoints.Register");
        var clientIp = ClientIpAddress.Hash(httpContext);

        var validationErrors = ValidateRegisterRequest(request);
        if (validationErrors.Count > 0)
        {
            logger.LogWarning("Registration validation failed with {ErrorCount} errors.", validationErrors.Count);
            return Results.ValidationProblem(validationErrors);
        }

        _ = ContactNormalization.TryNormalizeEmail(request.Email, out var email);
        var phoneNumber = ContactNormalization.NormalizeOptional(request.PhoneNumber) is null
            ? null
            : ContactNormalization.TryNormalizeEuPhoneNumber(request.PhoneNumber, out var normalizedPhone)
                ? normalizedPhone
                : null;

        if (await userManager.FindByEmailAsync(email) is not null)
        {
            logger.LogInformation("Registration rejected: email already exists in Identity.");
            return CreateRegistrationFailedResult();
        }

        var peopleEmailInUse = await db.People
            .AsNoTracking()
            .AnyAsync(p => p.Email == email, cancellationToken);

        if (peopleEmailInUse)
        {
            logger.LogInformation("Registration rejected: email already exists in People records.");
            return CreateRegistrationFailedResult();
        }

        if (!string.IsNullOrWhiteSpace(phoneNumber) && await IsPhoneNumberInUseAsync(phoneNumber, userManager, db, cancellationToken))
        {
            logger.LogInformation("Registration rejected: phone number already exists.");
            return CreateRegistrationFailedResult();
        }

        return await db.ExecuteInTransactionAsync(
            (transaction, token) => CreateAccountAsync(request, email, phoneNumber, clientIp, userManager, db, transaction, scopeFactory, logger, token),
            cancellationToken);
    }

    /** True when the phone number belongs to an Identity account or a People row. */
    private static async Task<bool> IsPhoneNumberInUseAsync(
        string phoneNumber,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var phoneLookupCandidates = ContactNormalization.BuildPhoneLookupCandidates(phoneNumber);
        var inIdentity = await userManager.Users
            .AnyAsync(x => x.PhoneNumber != null && phoneLookupCandidates.Contains(x.PhoneNumber.Trim()), cancellationToken);

        return inIdentity || await db.People
            .AsNoTracking()
            .AnyAsync(p => p.PhoneNumber != null && phoneLookupCandidates.Contains(p.PhoneNumber), cancellationToken);
    }

    /** The retriable unit: Identity user, domain person, commit; every failure returns without a commit, so it rolls back. */
    private static async Task<IResult> CreateAccountAsync(
        RegisterRequest request,
        string email,
        string? phoneNumber,
        string? clientIp,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        IDbContextTransaction transaction,
        IServiceScopeFactory scopeFactory,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var identityUser = new IdentityUser
        {
            UserName = email,
            Email = email,
            PhoneNumber = phoneNumber
        };

        var createUserResult = await userManager.CreateAsync(identityUser, request.Password);
        if (!createUserResult.Succeeded)
        {
            logger.LogWarning("Registration failed while creating identity user. ErrorCount: {ErrorCount}.", createUserResult.Errors.Count());
            return Results.ValidationProblem(createUserResult.ToValidationErrors());
        }

        var person = CreateMechanic(request, identityUser.Id, email, phoneNumber);
        db.Mechanics.Add(person);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (Data.UniqueConstraintDetection.IsUniqueConstraintViolation(ex))
        {
            logger.LogInformation("Registration failed due to unique constraint conflict on persisted data.");
            return CreateRegistrationFailedResult();
        }

        logger.LogInformation("Registration succeeded for person {PersonId} linked to identity user {IdentityUserId}. ClientIp: {ClientIp}.", person.Id, identityUser.Id, clientIp);

        // A mail failure never changes the registration outcome (user decision 2026-10-23),
        // so the send runs detached in its own DI scope.
        WelcomeMailDispatcher.Dispatch(scopeFactory, logger, person.Email, person.Name.ToString());

        return Results.Ok(new RegisterResponse(person.Id, PersonTypeResolver.Resolve(person), person.Email));
    }

    /** Field-level checks of the register body: required fields, formats, mechanic data and length caps. */
    private static Dictionary<string, string[]> ValidateRegisterRequest(RegisterRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        AddRequired(errors, nameof(request.PersonType), request.PersonType);
        AddRequired(errors, nameof(request.FirstName), request.FirstName);
        AddRequired(errors, nameof(request.LastName), request.LastName);
        AddRequired(errors, nameof(request.Email), request.Email);
        AddRequired(errors, nameof(request.Password), request.Password);

        NameFieldsValidator.ValidateNames(request.FirstName, request.MiddleName, request.LastName, errors);

        if (!string.IsNullOrWhiteSpace(request.Email) && !ContactNormalization.TryNormalizeEmail(request.Email, out _))
        {
            errors[nameof(request.Email)] = [ValidationMessages.InvalidEmail];
        }

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber) && !ContactNormalization.TryNormalizeEuPhoneNumber(request.PhoneNumber, out _))
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
            ValidateMechanicFields(request, errors);
        }

        FieldLengthValidator.AddMaxLengthError(errors, nameof(request.FirstName), request.FirstName?.Trim(), FieldLengthValidator.NameMaxLength);
        FieldLengthValidator.AddMaxLengthError(errors, nameof(request.MiddleName), request.MiddleName?.Trim(), FieldLengthValidator.NameMaxLength);
        FieldLengthValidator.AddMaxLengthError(errors, nameof(request.LastName), request.LastName?.Trim(), FieldLengthValidator.NameMaxLength);
        FieldLengthValidator.AddMaxLengthError(errors, nameof(request.Email), request.Email, FieldLengthValidator.EmailMaxLength);
        FieldLengthValidator.AddMaxLengthError(errors, nameof(request.Password), request.Password, FieldLengthValidator.PasswordMaxLength);
        FieldLengthValidator.AddMaxLengthError(errors, nameof(request.PhoneNumber), request.PhoneNumber, FieldLengthValidator.PhoneNumberMaxLength);

        return errors;
    }

    /** Specialization and expertise rules of a mechanic registration. */
    private static void ValidateMechanicFields(RegisterRequest request, Dictionary<string, string[]> errors)
    {
        AddRequired(errors, nameof(request.Specialization), request.Specialization);

        if (!string.IsNullOrWhiteSpace(request.Specialization)
            && !DefinedEnum.TryParse<SpecializationType>(request.Specialization, out _))
        {
            errors[nameof(request.Specialization)] = ["Specialization is invalid."];
        }

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
        else if (!TryParseExpertise(request.Expertise, out _, out var invalidExpertise))
        {
            errors[nameof(request.Expertise)] = [$"Expertise value '{invalidExpertise}' is invalid."];
        }
    }

    /** Builds the mechanic from a request that ValidateRegisterRequest already accepted. */
    private static Mechanic CreateMechanic(RegisterRequest request, string identityUserId, string email, string? phoneNumber)
    {
        var fullName = new FullName(request.FirstName.Trim(), ContactNormalization.NormalizeOptional(request.MiddleName), request.LastName.Trim());
        _ = DefinedEnum.TryParse<SpecializationType>(request.Specialization, out var specialization);
        _ = TryParseExpertise(request.Expertise ?? [], out var expertise, out _);

        return new Mechanic(fullName, email, phoneNumber, specialization, expertise)
        {
            IdentityUserId = identityUserId
        };
    }

    /** Parses every expertise value; false with the first invalid value when one is not a defined expertise. */
    private static bool TryParseExpertise(IReadOnlyCollection<string> expertiseValues, out List<ExpertiseType> expertise, out string? invalidValue)
    {
        expertise = [];
        invalidValue = null;

        foreach (var expertiseValue in expertiseValues)
        {
            if (!DefinedEnum.TryParse<ExpertiseType>(expertiseValue, out var parsedValue))
            {
                invalidValue = expertiseValue;
                return false;
            }

            expertise.Add(parsedValue);
        }

        return true;
    }

    /** The one 400 answer of every refused registration, so a taken email or phone stays indistinguishable. */
    private static IResult CreateRegistrationFailedResult()
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["register"] = [GenericRegistrationFailureMessage],
        });
    }
}