using AutoService.ApiService.Data;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Auth.Endpoints;

public static partial class AuthEndpoints
{
    // Fixed dummy hash gives the user-not-found path a verification cost comparable to
    // found-but-wrong-password (CheckPasswordSignInAsync), so timing can't leak registration status.
    private static readonly Lazy<string> DummyPasswordHash = new(() =>
        new PasswordHasher<IdentityUser>().HashPassword(new IdentityUser(), "Dummy-Password-For-Timing-Parity-0000"));

    /** Password login: resolves the account, checks the password with lockout counting and issues the session cookies. */
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
        var clientIp = ClientIpAddress.Hash(httpContext);

        var validationErrors = ValidateLoginRequest(request);
        if (validationErrors.Count > 0)
        {
            logger.LogWarning("Login request validation failed with {ErrorCount} errors.", validationErrors.Count);
            return Results.ValidationProblem(validationErrors);
        }

        if (!TryResolveLoginIdentifier(request, logger, out var email, out var phoneNumber, out var rejection))
        {
            return rejection!;
        }

        var identityUser = await FindLoginIdentityUserAsync(userManager, email, phoneNumber, cancellationToken);

        if (identityUser is null)
        {
            // Dummy verification to keep this path's cost comparable to CheckPasswordSignInAsync below.
            _ = new PasswordHasher<IdentityUser>().VerifyHashedPassword(new IdentityUser(), DummyPasswordHash.Value, request.Password);

            logger.LogInformation("Login failed: no identity user found for provided identifier. ClientIp: {ClientIp}.", clientIp);
            return InvalidCredentialsResult();
        }

        // A locked-out account fails like a wrong password, so the lockout is not observable from login.
        var passwordAccepted = await PasswordCheck.VerifyForLoginAsync(signInManager, identityUser, request.Password);
        if (!passwordAccepted)
        {
            logger.LogInformation("Login failed: invalid credentials or active lockout. ClientIp: {ClientIp}.", clientIp);
            return InvalidCredentialsResult();
        }

        var mechanic = await db.Mechanics
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.IdentityUserId == identityUser.Id, cancellationToken);

        if (mechanic is null)
        {
            // Do not reveal that Identity user exists but domain record is missing.
            logger.LogWarning("Login failed: linked mechanic record missing for identity user {IdentityUserId}.", identityUser.Id);
            return ApiProblem.Unauthorized("Invalid login credentials.");
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
        return Results.Ok(new SessionResponse(mechanic.Id, isAdmin, mechanic.MustChangePassword));
    }

    /** Splits the login identifier into a normalized email or phone number, or the 400 result for a malformed one. */
    private static bool TryResolveLoginIdentifier(
        LoginRequest request,
        ILogger logger,
        out string? email,
        out string? phoneNumber,
        out IResult? rejection)
    {
        email = null;
        phoneNumber = null;
        rejection = null;

        var rawEmail = ContactNormalization.NormalizeOptional(request.Email);
        var rawPhoneNumber = ContactNormalization.NormalizeOptional(request.PhoneNumber);

        if (rawEmail is not null && rawEmail.Contains('@'))
        {
            if (!ContactNormalization.TryNormalizeEmail(rawEmail, out var normalizedEmail))
            {
                logger.LogWarning("Login rejected due to invalid email format.");
                rejection = Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    [nameof(request.Email)] = [ValidationMessages.InvalidEmail]
                });
                return false;
            }

            email = normalizedEmail;
        }

        // Backward compatibility: if "email" is provided without '@', treat it as a phone login identifier.
        if (rawPhoneNumber is null && rawEmail is not null && !rawEmail.Contains('@', StringComparison.Ordinal))
        {
            rawPhoneNumber = rawEmail;
        }

        if (rawPhoneNumber is null)
        {
            return true;
        }

        if (!ContactNormalization.TryNormalizeEuPhoneNumber(rawPhoneNumber, out var normalizedPhoneNumber))
        {
            logger.LogWarning("Login rejected due to invalid phone number format.");
            rejection = Results.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(request.PhoneNumber)] = [ValidationMessages.InvalidPhone]
            });
            return false;
        }

        phoneNumber = normalizedPhoneNumber;
        return true;
    }

    /** Looks the account up by email, else by phone number; null when neither identifier matches. */
    private static async Task<IdentityUser?> FindLoginIdentityUserAsync(
        UserManager<IdentityUser> userManager,
        string? email,
        string? phoneNumber,
        CancellationToken cancellationToken)
    {
        if (email is not null)
        {
            return await userManager.FindByEmailAsync(email);
        }

        if (phoneNumber is null)
        {
            return null;
        }

        var phoneLookupCandidates = ContactNormalization.BuildPhoneLookupCandidates(phoneNumber);
        return await userManager.Users
            .FirstOrDefaultAsync(x => x.PhoneNumber != null && phoneLookupCandidates.Contains(x.PhoneNumber.Trim()), cancellationToken);
    }

    /** The one 401 answer of every failed login, so the failure causes stay indistinguishable. */
    private static IResult InvalidCredentialsResult() =>
        Results.Problem(
            title: "invalid_credentials",
            detail: "Invalid login credentials.",
            statusCode: StatusCodes.Status401Unauthorized);

    /** Field-level checks of the login body: password and one identifier required, length caps. */
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