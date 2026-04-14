/**
 * AuthEndpoints.Validate.cs
 *
 * Auto-generated documentation header for this source file.
 */

using System.Security.Claims;

namespace AutoService.ApiService.Auth.Endpoints;

/**
 * Backend type for API logic in this file.
 */
public static partial class AuthEndpoints
{
    /**
     * Handles GET /api/auth/validate.
     * Returns token-derived profile claims if the JWT is valid and authorized.
     *
     * @param httpContext Current request context with authenticated user claims.
     * @return 200 OK with person linkage claims.
     */
    private static IResult ValidateTokenAsync(HttpContext httpContext)
    {
        var personIdClaim = httpContext.User.FindFirst("person_id")?.Value;
        var personType = httpContext.User.FindFirst("person_type")?.Value;
        var email = httpContext.User.FindFirst(ClaimTypes.Email)?.Value
            ?? httpContext.User.FindFirst("email")?.Value;

        if (!int.TryParse(personIdClaim, out var personId) ||
            string.IsNullOrWhiteSpace(personType) ||
            string.IsNullOrWhiteSpace(email))
        {
            return Results.Problem(
                detail: "Token claims are incomplete.",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        var isAdmin = httpContext.User.IsInRole("Admin");
        return Results.Ok(new ValidateTokenResponse(personId, personType, email, isAdmin));
    }
}
