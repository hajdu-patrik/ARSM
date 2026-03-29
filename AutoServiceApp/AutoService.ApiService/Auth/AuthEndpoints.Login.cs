using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace AutoService.ApiService.Auth;

public static partial class AuthEndpoints
{
    /**
     * Handles POST /api/auth/login.
     * Verifies credentials via Identity, looks up the linked domain People record,
     * and issues a 10-minute JWT containing identity and domain claims.
     *
     * @param request Login payload (email or phone number + password).
     * @param userManager ASP.NET Core Identity user manager.
     * @param signInManager ASP.NET Core Identity sign in manager.
     * @param db Entity Framework Core database context.
     * @param configuration Application configuration (used to read JwtSettings:Secret).
     * @param cancellationToken Cancellation token for the async operation.
     * @return 200 OK with JWT token and profile info, 404 when email/phone is not found,
     *         401 when password is invalid, or 500 if the linked domain record is missing.
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
            return Results.NotFound(new
            {
                code = "identifier_not_found",
                message = "The provided email or phone number does not exist."
            });
        }

        var signInResult = await signInManager.CheckPasswordSignInAsync(identityUser, request.Password, lockoutOnFailure: true);
        if (!signInResult.Succeeded)
        {
            return Results.Problem(
                title: "password_incorrect",
                detail: "The provided password is incorrect.",
                statusCode: StatusCodes.Status401Unauthorized);
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
}