using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Http;
using AutoService.ApiService.Identity;

namespace AutoService.ApiService.Auth.Endpoints;

public static partial class AuthEndpoints
{
    /** Handles GET /api/auth/validate. Returns token-derived session facts if the JWT is valid and authorized. */
    private static IResult ValidateTokenAsync(HttpContext httpContext)
    {
        if (!httpContext.User.TryGetPersonId(out var personId))
        {
            return ApiProblem.Unauthorized("Token claims are incomplete.");
        }

        var user = httpContext.User;
        return Results.Ok(new SessionResponse(
            personId,
            user.IsInRole("Admin"),
            user.HasClaim(PasswordChangeRequiredClaim.Type, PasswordChangeRequiredClaim.Value)));
    }
}
