using AutoService.ApiService.Security;

namespace AutoService.ApiService.Auth.Endpoints;

/** Registers auth routes under the /api/auth group. Handler logic is split into dedicated partial files. */
public static partial class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", RegisterAsync)
            .RequireAuthorization("AdminOnly")
            .RequireRateLimiting(RateLimitPolicies.StaffEmailSends)
            .Produces<RegisterResponse>(StatusCodes.Status200OK)
            .ProducesValidationProblem(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        group.MapPost("/login", LoginAsync)
            .RequireRateLimiting(RateLimitPolicies.AuthLogin)
            .Produces<SessionResponse>(StatusCodes.Status200OK)
            .ProducesValidationProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .Produces<object>(StatusCodes.Status429TooManyRequests);

        group.MapPost("/refresh", RefreshAsync)
            .RequireRateLimiting(RateLimitPolicies.AuthRefresh)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status429TooManyRequests);

        // No RequireAuthorization: an expired access cookie must not keep the refresh session alive (LogoutAsync).
        group.MapPost("/logout", LogoutAsync)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/validate", ValidateTokenAsync)
            .RequireAuthorization()
            .Produces<SessionResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return endpoints;
    }
}
