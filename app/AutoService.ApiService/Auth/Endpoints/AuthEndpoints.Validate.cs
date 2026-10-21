using AutoService.ApiService.Http;
using AutoService.ApiService.Identity;

namespace AutoService.ApiService.Auth.Endpoints;

public static partial class AuthEndpoints
{
    /** Handles GET /api/auth/validate. Returns token-derived profile claims if the JWT is valid and authorized. */
    private static IResult ValidateTokenAsync(HttpContext httpContext)
    {
        if (!httpContext.User.TryGetPersonId(out var personId))
        {
            return ApiProblem.Unauthorized("Token claims are incomplete.");
        }

        var isAdmin = httpContext.User.IsInRole("Admin");
        return Results.Ok(new ValidateTokenResponse(personId, isAdmin));
    }
}
