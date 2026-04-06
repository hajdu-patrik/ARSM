using AutoService.ApiService.Auth;
using AutoService.ApiService.Data;
using AutoService.ApiService.Models.UniqueTypes;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Mail;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace AutoService.ApiService.Profile;

public static partial class ProfileEndpoints
{
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

        // Email update.
        if (request.Email is not null)
        {
            var trimmedEmail = request.Email.Trim().ToLowerInvariant();

            if (!IsValidEmail(trimmedEmail))
            {
                errors["Email"] = ["Email must be a valid email address."];
            }
            else if (!string.Equals(trimmedEmail, person.Email, StringComparison.OrdinalIgnoreCase))
            {
                var emailInUse = await db.People
                    .AnyAsync(p => p.Email == trimmedEmail && p.Id != person.Id, cancellationToken);

                if (emailInUse)
                {
                    errors["Email"] = ["An account already exists with this email address."];
                }
                else
                {
                    person.Email = trimmedEmail;

                    if (identityUser is not null)
                    {
                        identityUser.Email = trimmedEmail;
                        identityUser.UserName = trimmedEmail;
                        identityUser.NormalizedEmail = trimmedEmail.ToUpperInvariant();
                        identityUser.NormalizedUserName = trimmedEmail.ToUpperInvariant();
                        await userManager.UpdateAsync(identityUser);
                    }
                }
            }
        }

        // Phone update.
        if (request.PhoneNumber is not null)
        {
            var trimmedPhone = request.PhoneNumber.Trim();
            if (string.IsNullOrWhiteSpace(trimmedPhone))
            {
                person.PhoneNumber = null;
                if (identityUser is not null)
                {
                    identityUser.PhoneNumber = null;
                    await userManager.UpdateAsync(identityUser);
                }
            }
            else
            {
                if (!AuthEndpoints.TryNormalizeHungarianPhoneNumber(trimmedPhone, out var normalizedPhone))
                {
                    errors["PhoneNumber"] = ["Phone number must be a valid Hungarian number."];
                }
                else
                {
                    var phoneInUse = await db.People
                        .AnyAsync(p => p.PhoneNumber != null && p.PhoneNumber == normalizedPhone && p.Id != person.Id, cancellationToken);

                    if (phoneInUse)
                    {
                        errors["PhoneNumber"] = ["An account already exists with this phone number."];
                    }
                    else
                    {
                        person.PhoneNumber = normalizedPhone;
                        if (identityUser is not null)
                        {
                            identityUser.PhoneNumber = normalizedPhone;
                            await userManager.UpdateAsync(identityUser);
                        }
                    }
                }
            }
        }

        // Middle name update.
        if (request.MiddleName is not null)
        {
            var middleName = string.IsNullOrWhiteSpace(request.MiddleName) ? null : request.MiddleName.Trim();
            person.Name = new FullName(person.Name.FirstName, middleName, person.Name.LastName);
        }

        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(new ProfileResponse(
            person.Id,
            GetPersonType(person),
            person.Name.FirstName,
            person.Name.MiddleName,
            person.Name.LastName,
            person.Email,
            person.PhoneNumber,
            person.ProfilePicture is not null));
    }

    private static async Task<IResult> ChangePasswordAsync(
        ChangePasswordRequest request,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            errors["CurrentPassword"] = ["Current password is required."];
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            errors["NewPassword"] = ["New password is required."];
        }

        if (string.IsNullOrWhiteSpace(request.ConfirmNewPassword))
        {
            errors["ConfirmNewPassword"] = ["Password confirmation is required."];
        }

        if (!string.IsNullOrWhiteSpace(request.NewPassword) &&
            !string.IsNullOrWhiteSpace(request.ConfirmNewPassword) &&
            !string.Equals(request.NewPassword, request.ConfirmNewPassword, StringComparison.Ordinal))
        {
            errors["ConfirmNewPassword"] = ["Passwords do not match."];
        }

        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken);
        if (person?.IdentityUserId is null)
        {
            return Results.Problem(
                detail: "Linked identity account not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var identityUser = await userManager.FindByIdAsync(person.IdentityUserId);
        if (identityUser is null)
        {
            return Results.Problem(
                detail: "Identity account not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var changeResult = await userManager.ChangePasswordAsync(
            identityUser,
            request.CurrentPassword,
            request.NewPassword);

        if (!changeResult.Succeeded)
        {
            var identityErrors = changeResult.Errors
                .GroupBy(e => string.IsNullOrWhiteSpace(e.Code) ? "password" : e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());

            if (identityErrors.Remove("PasswordMismatch", out var mismatchMessages))
            {
                identityErrors["CurrentPassword"] = mismatchMessages;
            }

            return Results.ValidationProblem(identityErrors);
        }

        return Results.Ok(new { message = "Password changed successfully." });
    }

    private static async Task<IResult> DeleteProfileAsync(
        [FromBody] DeleteProfileRequest request,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        ITokenDenylistService tokenDenylistService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["CurrentPassword"] = ["Current password is required."]
            });
        }

        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken);
        if (person?.IdentityUserId is null)
        {
            return Results.Problem(
                detail: "Linked identity account not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var identityUser = await userManager.FindByIdAsync(person.IdentityUserId);
        if (identityUser is null)
        {
            return Results.Problem(
                detail: "Identity account not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var isAdmin = await userManager.IsInRoleAsync(identityUser, "Admin");
        if (isAdmin)
        {
            return Results.Problem(
                detail: "Administrator accounts cannot be deleted.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var validPassword = await userManager.CheckPasswordAsync(identityUser, request.CurrentPassword);
        if (!validPassword)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["CurrentPassword"] = ["Current password is invalid."]
            });
        }

        var nowUtc = DateTime.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        if (httpContext.Request.Cookies.TryGetValue(AuthCookieNames.RefreshToken, out var refreshTokenValue) &&
            !string.IsNullOrWhiteSpace(refreshTokenValue))
        {
            var refreshTokenHash = HashRefreshToken(refreshTokenValue);
            var refreshToken = await db.RefreshTokens
                .FirstOrDefaultAsync(x => x.TokenHash == refreshTokenHash, cancellationToken);

            if (refreshToken is not null && refreshToken.RevokedAtUtc is null)
            {
                refreshToken.Revoke(nowUtc);
                await db.SaveChangesAsync(cancellationToken);
            }
        }

        db.People.Remove(person);
        await db.SaveChangesAsync(cancellationToken);

        var deleteIdentityResult = await userManager.DeleteAsync(identityUser);
        if (!deleteIdentityResult.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);

            var identityErrors = deleteIdentityResult.Errors
                .GroupBy(e => string.IsNullOrWhiteSpace(e.Code) ? "identity" : e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());

            return Results.ValidationProblem(identityErrors);
        }

        await transaction.CommitAsync(cancellationToken);

        var jwtId = httpContext.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        var tokenExpiresAtUtc = ParseTokenExpiry(httpContext.User);

        if (!string.IsNullOrWhiteSpace(jwtId) && tokenExpiresAtUtc.HasValue)
        {
            tokenDenylistService.Revoke(jwtId, tokenExpiresAtUtc.Value);
        }

        httpContext.Response.Cookies.Delete(AuthCookieNames.AccessToken, new CookieOptions { Path = "/" });
        httpContext.Response.Cookies.Delete(AuthCookieNames.RefreshToken, new CookieOptions { Path = "/" });

        return Results.Ok(new { message = "Profile deleted successfully." });
    }

    private static string HashRefreshToken(string token)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hashBytes);
    }

    private static DateTimeOffset? ParseTokenExpiry(ClaimsPrincipal user)
    {
        var expClaim = user.FindFirst(JwtRegisteredClaimNames.Exp)?.Value;
        if (!long.TryParse(expClaim, out var expUnix))
        {
            return null;
        }

        return DateTimeOffset.FromUnixTimeSeconds(expUnix);
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var parsed = new MailAddress(email);
            return string.Equals(parsed.Address, email, StringComparison.Ordinal);
        }
        catch
        {
            return false;
        }
    }
}
