using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using AutoService.ApiService.Models.UniqueTypes;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace AutoService.ApiService.Auth;

/**
 * Registers all authentication endpoints and contains their handlers,
 * validation helpers, JWT generation logic, and DTO contracts.
 *
 * Only mechanics can register — customers are passive domain records
 * (vehicle owners / notification targets) managed internally by mechanics.
 */
public static class AuthEndpoints
{
    /**
     * Registers auth routes under the /api/auth group.
     *
     * @param endpoints The application endpoint route builder.
     * @return The same builder so calls can be chained.
     */
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", RegisterAsync);
        group.MapPost("/login", LoginAsync).RequireRateLimiting("AuthLoginAttempts");

        return endpoints;
    }

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

        var email = request.Email.Trim();
        var phoneNumber = NormalizeOptional(request.PhoneNumber);

        if (await userManager.FindByEmailAsync(email) is not null)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(request.Email)] = ["An account already exists with this email address."]
            });
        }

        if (!string.IsNullOrWhiteSpace(phoneNumber))
        {
            var phoneNumberInUse = await userManager.Users
                .AnyAsync(x => x.PhoneNumber == phoneNumber, cancellationToken);

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
     * Handles POST /api/auth/login.
     * Verifies credentials via Identity, looks up the linked domain People record,
     * and issues a 12-hour JWT containing identity and domain claims.
     *
    * @param request Login payload (email or phone number + password).
     * @param userManager ASP.NET Core Identity user manager.
     * @param db Entity Framework Core database context.
     * @param configuration Application configuration (used to read JwtSettings:Secret).
     * @param cancellationToken Cancellation token for the async operation.
     * @return 200 OK with JWT token and profile info, 401 Unauthorized on bad credentials,
     *         or 500 if the domain record is missing.
     */
    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        UserManager<IdentityUser> userManager,
        SignInManager<IdentityUser> signInManager,
        AutoServiceDbContext db,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var validationErrors = ValidateLoginRequest(request);
        if (validationErrors.Count > 0)
        {
            return Results.ValidationProblem(validationErrors);
        }

        var email = NormalizeOptional(request.Email);
        var phoneNumber = NormalizeOptional(request.PhoneNumber);

        // Backward compatibility: if "email" is provided without '@', treat it as a phone login identifier.
        if (phoneNumber is null &&
            email is not null &&
            !email.Contains('@'))
        {
            phoneNumber = email;
            email = null;
        }

        IdentityUser? identityUser = null;

        if (email is not null)
        {
            identityUser = await userManager.FindByEmailAsync(email);
        }
        else if (phoneNumber is not null)
        {
            identityUser = await userManager.Users
                .FirstOrDefaultAsync(x => x.PhoneNumber == phoneNumber, cancellationToken);
        }

        if (identityUser is null)
        {
            return Results.Unauthorized();
        }

        var signInResult = await signInManager.CheckPasswordSignInAsync(identityUser, request.Password, lockoutOnFailure: true);
        if (!signInResult.Succeeded)
        {
            return Results.Unauthorized();
        }

        var person = await db.People
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.IdentityUserId == identityUser.Id, cancellationToken);

        if (person is null)
        {
            return Results.Problem(
                detail: "The linked domain user record was not found.",
                statusCode: StatusCodes.Status500InternalServerError);
        }

        var expiresAtUtc = DateTime.UtcNow.AddMinutes(10);
        var token = CreateJwtToken(identityUser, person, configuration, expiresAtUtc);

        return Results.Ok(new LoginResponse(token, expiresAtUtc, person.Id, GetPersonType(person), identityUser.Email ?? person.Email));
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

        if (!string.IsNullOrWhiteSpace(request.Email) && !request.Email.Contains('@'))
        {
            errors[nameof(request.Email)] = ["Email must be a valid email address."];
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
    * Validates that password is present and either email or phone number is provided.
     *
     * @param request The incoming login payload.
     * @return A dictionary of field-level error messages; empty if valid.
     */
    private static Dictionary<string, string[]> ValidateLoginRequest(LoginRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        AddRequired(errors, nameof(request.Password), request.Password);

        var hasEmail = !string.IsNullOrWhiteSpace(request.Email);
        var hasPhone = !string.IsNullOrWhiteSpace(request.PhoneNumber);

        if (!hasEmail && !hasPhone)
        {
            errors["login"] = ["Either Email or PhoneNumber is required."];
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

    /**
     * Converts an Identity error result into the RFC 7807 validation problem format
     * used by Results.ValidationProblem().
     *
     * @param identityResult A failed IdentityResult from UserManager.
     * @return A dictionary keyed by error code with arrays of error descriptions.
     */
    private static Dictionary<string, string[]> ToValidationErrors(IdentityResult identityResult)
    {
        return identityResult.Errors
            .GroupBy(x => string.IsNullOrWhiteSpace(x.Code) ? "identity" : x.Code)
            .ToDictionary(group => group.Key, group => group.Select(x => x.Description).ToArray());
    }

    /**
     * Builds and serialises a signed JWT containing identity and domain claims.
     * Reads the signing secret from JwtSettings:Secret in configuration.
     * Claims included: sub, nameidentifier, email, name, person_id, person_type.
     *
     * @param identityUser ASP.NET Core Identity user (provides sub/email).
     * @param person Domain People record (provides person_id/person_type/name).
     * @param configuration Application configuration root.
     * @param expiresAtUtc UTC expiry timestamp for the token.
     * @return A compact serialised JWT string.
     */
    private static string CreateJwtToken(
        IdentityUser identityUser,
        People person,
        IConfiguration configuration,
        DateTime expiresAtUtc)
    {
        var secret = JwtSettingsResolver.ResolveSecret(configuration);
        var issuer = configuration["JwtSettings:Issuer"] ?? "AutoService.ApiService";
        var audience = configuration["JwtSettings:Audience"] ?? "AutoService.WebUI";
        var now = DateTime.UtcNow;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, identityUser.Id),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new(ClaimTypes.NameIdentifier, identityUser.Id),
            new(JwtRegisteredClaimNames.Email, identityUser.Email ?? person.Email),
            new(ClaimTypes.Email, identityUser.Email ?? person.Email),
            new(ClaimTypes.Name, person.Name.ToString()),
            new("person_id", person.Id.ToString()),
            new("person_type", GetPersonType(person))
        };

        var signingCredentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: now,
            expires: expiresAtUtc,
            signingCredentials: signingCredentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /**
     * Returns the lowercase string role label for a domain person entity.
     * Used as the person_type claim in JWT tokens and in API responses.
     *
     * @param person A Customer or Mechanic instance.
     * @return "mechanic" or "customer".
     */
    private static string GetPersonType(People person) => person switch
    {
        Mechanic => "mechanic",
        Customer => "customer",
        _ => throw new InvalidOperationException("Unsupported person type.")
    };

    /**
     * Returns null for blank/whitespace-only strings, or the trimmed value otherwise.
     * Used to normalise optional fields such as middle name and phone number.
     *
     * @param value Raw string from the request.
     * @return Trimmed string, or null.
     */
    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /**
     * Appends a "field is required" error entry if the value is null or whitespace.
     *
     * @param errors The working error dictionary to append to.
     * @param key The field name used as the error key.
     * @param value The field value to check.
     */
    private static void AddRequired(Dictionary<string, string[]> errors, string key, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[key] = [$"{key} is required."];
        }
    }

    // ─── DTO contracts ────────────────────────────────────────────────────────

    /** POST /api/auth/register request body. Mechanic-only; Customer is not supported. */
    internal sealed record RegisterRequest(
        string PersonType,       // Must be "Mechanic".
        string FirstName,
        string? MiddleName,      // Optional.
        string LastName,
        string Email,
        string Password,         // Must satisfy Identity password policy (≥8 chars, digit, upper, lower, special).
        string? PhoneNumber,     // Optional.
        string? Specialization,  // Required for Mechanic; must match SpecializationType enum.
        IReadOnlyList<string>? Expertise); // Required for Mechanic; 1..10 unique ExpertiseType values.

    /** Returned after a successful registration with identity and domain record IDs. */
    internal sealed record RegisterResponse(string IdentityUserId, int PersonId, string PersonType, string Email);

    /** POST /api/auth/login request body. Supply either Email or PhoneNumber and Password. */
    internal sealed record LoginRequest(string? Email, string? PhoneNumber, string Password);

    /** Returned after a successful login containing the JWT and basic profile info. */
    internal sealed record LoginResponse(string Token, DateTime ExpiresAtUtc, int PersonId, string PersonType, string Email);
}