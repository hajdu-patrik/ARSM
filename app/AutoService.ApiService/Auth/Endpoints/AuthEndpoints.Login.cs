using AutoService.ApiService.Data;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Auth.Endpoints;

/** Partial class containing the login endpoint handler and its supporting helpers. */
public static partial class AuthEndpoints
{
    // Fixed dummy hash gives the user-not-found path a verification cost comparable to
    // found-but-wrong-password (CheckPasswordSignInAsync), so timing can't leak registration status.
    private static readonly Lazy<string> DummyPasswordHash = new(() =>
        new PasswordHasher<IdentityUser>().HashPassword(new IdentityUser(), "Dummy-Password-For-Timing-Parity-0000"));

    /** Handles POST /api/auth/login by validating the identifier/password pair and issuing access/refresh cookies for linked mechanic identities. */
    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        SignInManager<IdentityUser> signInManager,
        AutoServiceDbContext db,
        IJwtTokenIssuer tokenIssuer,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AuthEndpoints.Login");
        var clientIp = ResolveClientIpAddress(httpContext);

        var validationErrors = ValidateLoginRequest(request);
        if (validationErrors.Count > 0)
        {
            logger.LogWarning("Login request validation failed with {ErrorCount} errors.", validationErrors.Count);
            return Results.ValidationProblem(validationErrors);
        }

        string? email = null;
        string? phoneNumber = null;

        var rawEmail = NormalizeOptional(request.Email);
        var rawPhoneNumber = NormalizeOptional(request.PhoneNumber);

        if (rawEmail is not null && rawEmail.Contains('@'))
        {
            if (!TryNormalizeEmail(rawEmail, out var normalizedEmail))
            {
                logger.LogWarning("Login rejected due to invalid email format.");
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    [nameof(request.Email)] = [ValidationMessages.InvalidEmail]
                });
            }

            email = normalizedEmail;
        }

        // Backward compatibility: if "email" is provided without '@', treat it as a phone login identifier.
        if (phoneNumber is null &&
            rawPhoneNumber is null &&
            rawEmail is not null &&
            !rawEmail.Contains('@', StringComparison.Ordinal))
        {
            rawPhoneNumber = rawEmail;
        }

        if (rawPhoneNumber is not null)
        {
            if (!TryNormalizeEuPhoneNumber(rawPhoneNumber, out var normalizedPhoneNumber))
            {
                logger.LogWarning("Login rejected due to invalid phone number format.");
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    [nameof(request.PhoneNumber)] = [ValidationMessages.InvalidPhone]
                });
            }

            phoneNumber = normalizedPhoneNumber;
        }

        IdentityUser? identityUser = null;

        if (email is not null)
        {
            identityUser = await userManager.FindByEmailAsync(email);
        }
        else if (phoneNumber is not null)
        {
            var phoneLookupCandidates = BuildPhoneLookupCandidates(phoneNumber);
            identityUser = await userManager.Users
                .FirstOrDefaultAsync(x => x.PhoneNumber != null && phoneLookupCandidates.Contains(x.PhoneNumber.Trim()), cancellationToken);
        }

        if (identityUser is null)
        {
            // Dummy verification to keep this path's cost comparable to CheckPasswordSignInAsync below.
            _ = new PasswordHasher<IdentityUser>().VerifyHashedPassword(new IdentityUser(), DummyPasswordHash.Value, request.Password);

            logger.LogInformation("Login failed: no identity user found for provided identifier. ClientIp: {ClientIp}.", clientIp);
            return Results.Problem(
                title: "invalid_credentials",
                detail: "Invalid login credentials.",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        var signInResult = await signInManager.CheckPasswordSignInAsync(identityUser, request.Password, lockoutOnFailure: true);
        if (signInResult.IsLockedOut)
        {
            var lockoutEnd = await userManager.GetLockoutEndDateAsync(identityUser);
            var retryAfterSeconds = lockoutEnd.HasValue
                ? Math.Max(1, (int)Math.Ceiling((lockoutEnd.Value.UtcDateTime - DateTime.UtcNow).TotalSeconds))
                : 60;

            logger.LogWarning("Login blocked due to active lockout. Retry after {RetryAfterSeconds} seconds. ClientIp: {ClientIp}.", retryAfterSeconds, clientIp);

            return Results.Json(new
            {
                code = "lockout_active",
                message = "Too many attempts. Try again later.",
                retryAfterSeconds
            }, statusCode: StatusCodes.Status429TooManyRequests);
        }

        if (!signInResult.Succeeded)
        {
            logger.LogInformation("Login failed: invalid credentials. ClientIp: {ClientIp}.", clientIp);
            return Results.Problem(
                title: "invalid_credentials",
                detail: "Invalid login credentials.",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        var mechanic = await db.Mechanics
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.IdentityUserId == identityUser.Id, cancellationToken);

        if (mechanic is null)
        {
            // Do not reveal that Identity user exists but domain record is missing.
            logger.LogWarning("Login failed: linked mechanic record missing for identity user {IdentityUserId}.", identityUser.Id);
            return Results.Problem(
                detail: "Invalid login credentials.",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        var nowUtc = DateTime.UtcNow;
        var accessTokenExpiresAtUtc = nowUtc.Add(AccessTokenTtl);
        var refreshTokenExpiresAtUtc = nowUtc.Add(RefreshTokenTtl);

        var roles = await userManager.GetRolesAsync(identityUser);
        var accessToken = tokenIssuer.CreateToken(identityUser, mechanic, roles, accessTokenExpiresAtUtc);
        var refreshTokenValue = GenerateRefreshTokenValue();
        var refreshTokenHash = HashRefreshToken(refreshTokenValue);

        db.RefreshTokens.Add(new RefreshToken(
            mechanic.Id,
            refreshTokenHash,
            nowUtc,
            refreshTokenExpiresAtUtc,
            clientIp,
            httpContext.Request.Headers.UserAgent.ToString()));

        await db.SaveChangesAsync(cancellationToken);

        IssueSessionCookies(httpContext.Response, accessToken, refreshTokenValue);

        var isAdmin = roles.Contains("Admin");
        logger.LogInformation("Login succeeded for mechanic {MechanicId}. IsAdmin: {IsAdmin}. ClientIp: {ClientIp}.", mechanic.Id, isAdmin, clientIp);
        return Results.Ok(new LoginResponse(mechanic.Id, isAdmin));
    }

    /** Validates presence of required login fields. */
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

        FieldLengthValidator.AddMaxLengthError(errors, nameof(request.Email), request.Email, FieldLengthValidator.EmailMaxLength);
        FieldLengthValidator.AddMaxLengthError(errors, nameof(request.PhoneNumber), request.PhoneNumber, FieldLengthValidator.PhoneNumberMaxLength);
        FieldLengthValidator.AddMaxLengthError(errors, nameof(request.Password), request.Password, FieldLengthValidator.PasswordMaxLength);

        return errors;
    }
}