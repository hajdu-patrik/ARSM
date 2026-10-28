using Microsoft.AspNetCore.Identity;

namespace AutoService.ApiService.Auth.Security;

/** The one password verification of the API: every failure counts toward the Identity lockout. Change-password and
    profile deletion answer a locked-out account 429; login only gets pass/fail, so the lockout stays unobservable. */
internal static class PasswordCheck
{
    /** Login check: counts failures toward the lockout, but a locked-out account is just a failure (never a 429). */
    internal static async Task<bool> VerifyForLoginAsync(
        SignInManager<IdentityUser> signInManager,
        IdentityUser identityUser,
        string password)
    {
        var signInResult = await signInManager.CheckPasswordSignInAsync(identityUser, password, lockoutOnFailure: true);
        return signInResult.Succeeded;
    }

    /** Verifies the password with lockout counting: whether it matched, and the 429 result to answer with when the account is locked out. */
    internal static async Task<(bool Succeeded, IResult? LockoutResult)> VerifyAsync(
        SignInManager<IdentityUser> signInManager,
        UserManager<IdentityUser> userManager,
        IdentityUser identityUser,
        string password)
    {
        var signInResult = await signInManager.CheckPasswordSignInAsync(identityUser, password, lockoutOnFailure: true);

        if (signInResult.IsLockedOut)
        {
            return (false, await LockoutResultAsync(userManager, identityUser));
        }

        return (signInResult.Succeeded, null);
    }

    /** 429 with the seconds left of the lockout, so the client can show when a new attempt makes sense. */
    private static async Task<IResult> LockoutResultAsync(UserManager<IdentityUser> userManager, IdentityUser identityUser)
    {
        var lockoutEnd = await userManager.GetLockoutEndDateAsync(identityUser);
        var retryAfterSeconds = lockoutEnd.HasValue
            ? Math.Max(1, (int)Math.Ceiling((lockoutEnd.Value.UtcDateTime - DateTime.UtcNow).TotalSeconds))
            : 60;

        return Results.Json(new
        {
            code = "lockout_active",
            message = "Too many attempts. Try again later.",
            retryAfterSeconds
        }, statusCode: StatusCodes.Status429TooManyRequests);
    }
}
