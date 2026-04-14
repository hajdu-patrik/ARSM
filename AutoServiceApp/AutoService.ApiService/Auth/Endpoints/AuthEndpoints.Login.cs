/**
 * AuthEndpoints.Login.cs
 *
 * Auto-generated documentation header for this source file.
 */

using AutoService.ApiService.Data;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Auth.Endpoints;

/**
 * Backend type for API logic in this file.
 */
public static partial class AuthEndpoints
{
    /**
     * Handles POST /api/auth/login by validating the identifier/password pair
     * and issuing access/refresh cookies for linked mechanic identities.
     *
     * @param request Login payload (email or phone number plus password).
     * @param httpContext Current request context used for cookies/client metadata.
     * @param userManager Identity user manager.
     * @param signInManager Identity sign-in manager.
     * @param db Database context.
     * @param tokenIssuer JWT issuer service.
     * @param loggerFactory Logger factory used to create endpoint logger.
     * @param cancellationToken Request cancellation token.
     * @return 200 OK on success, 401 on invalid credentials, or 429 when lockout is active.
     */
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
                    [nameof(request.Email)] = ["Email must be a valid email address."]
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
            if (!TryNormalizeHungarianPhoneNumber(rawPhoneNumber, out var normalizedPhoneNumber))
            {
                logger.LogWarning("Login rejected due to invalid phone number format.");
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    [nameof(request.PhoneNumber)] = ["Phone number must be a valid Hungarian number."]
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
            var phoneLookupCandidates = BuildHungarianPhoneLookupCandidates(phoneNumber);
            identityUser = await userManager.Users
                .FirstOrDefaultAsync(x => x.PhoneNumber != null && phoneLookupCandidates.Contains(x.PhoneNumber.Trim()), cancellationToken);
        }

        if (identityUser is null)
        {
            logger.LogInformation("Login failed: no identity user found for provided identifier.");
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

            logger.LogWarning("Login blocked due to active lockout. Retry after {RetryAfterSeconds} seconds.", retryAfterSeconds);

            return Results.Json(new
            {
                code = "lockout_active",
                message = "Too many attempts. Try again later.",
                retryAfterSeconds
            }, statusCode: StatusCodes.Status429TooManyRequests);
        }

        if (!signInResult.Succeeded)
        {
            logger.LogInformation("Login failed: invalid credentials.");
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
        var accessTokenTtl = TimeSpan.FromMinutes(10);
        var refreshTokenTtl = TimeSpan.FromDays(7);
        var accessTokenExpiresAtUtc = nowUtc.Add(accessTokenTtl);
        var refreshTokenExpiresAtUtc = nowUtc.Add(refreshTokenTtl);

        var roles = await userManager.GetRolesAsync(identityUser);
        var accessToken = tokenIssuer.CreateToken(identityUser, mechanic, roles, accessTokenExpiresAtUtc);
        var refreshTokenValue = GenerateRefreshTokenValue();
        var refreshTokenHash = HashRefreshToken(refreshTokenValue);

        db.RefreshTokens.Add(new RefreshToken(
            mechanic.Id,
            refreshTokenHash,
            nowUtc,
            refreshTokenExpiresAtUtc,
            ResolveClientIpAddress(httpContext),
            httpContext.Request.Headers.UserAgent.ToString()));

        await db.SaveChangesAsync(cancellationToken);

        httpContext.Response.Cookies.Append(
            AuthCookieNames.AccessToken,
            accessToken,
            BuildAccessTokenCookieOptions(accessTokenTtl));

        httpContext.Response.Cookies.Append(
            AuthCookieNames.RefreshToken,
            refreshTokenValue,
            BuildRefreshTokenCookieOptions(refreshTokenTtl));

        var isAdmin = roles.Contains("Admin");
        logger.LogInformation("Login succeeded for mechanic {MechanicId}. IsAdmin: {IsAdmin}.", mechanic.Id, isAdmin);
        return Results.Ok(new LoginResponse(accessTokenExpiresAtUtc, mechanic.Id, PersonTypeResolver.Resolve(mechanic), identityUser.Email ?? mechanic.Email, isAdmin));
    }

    /**
     * Validates presence of required login fields.
     *
     * @param request Incoming login payload.
     * @return Field-level validation errors keyed by request property name.
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
}