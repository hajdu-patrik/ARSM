using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace AutoService.ApiService.Profile.Endpoints;

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

        var updatedEmail = person.Email;
        var updatedPhoneNumber = person.PhoneNumber;
        var emailChanged = false;
        var phoneChanged = false;

        // Email update.
        if (request.Email is not null)
        {
            if (!ContactNormalization.TryNormalizeEmail(request.Email, out var normalizedEmail))
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
                if (!ContactNormalization.TryNormalizeHungarianPhoneNumber(normalizedOptionalPhone, out var normalizedPhone))
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

        // Name updates: validate provided fields, keep existing values when not provided.
        string firstName = person.Name.FirstName;
        if (request.FirstName is not null)
        {
            if (string.IsNullOrWhiteSpace(request.FirstName))
            {
                errors["FirstName"] = [ValidationMessages.FirstNameRequired];
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
            var refreshTokenHash = TokenSecurity.HashSha256(refreshTokenValue);
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
        var tokenExpiresAtUtc = TokenSecurity.ParseJwtExpiry(httpContext.User);

        if (!string.IsNullOrWhiteSpace(jwtId) && tokenExpiresAtUtc.HasValue)
        {
            await tokenDenylistService.RevokeAsync(jwtId, tokenExpiresAtUtc.Value, cancellationToken);
        }

        httpContext.Response.Cookies.Delete(AuthCookieNames.AccessToken, new CookieOptions { Path = "/" });
        httpContext.Response.Cookies.Delete(AuthCookieNames.RefreshToken, new CookieOptions { Path = "/" });

        return Results.Ok(new { message = "Profile deleted successfully." });
    }

}
