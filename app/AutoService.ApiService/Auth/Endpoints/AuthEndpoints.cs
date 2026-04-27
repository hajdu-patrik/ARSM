using Microsoft.AspNetCore.Routing;

namespace AutoService.ApiService.Auth.Endpoints;

/**
 * Registers auth routes under the /api/auth group.
 * Handler logic is split into dedicated partial files.
 */
public static partial class AuthEndpoints
{
    /**
     * Registers auth routes under the /api/auth group.
     *
     * @param endpoints The application endpoint route builder.
     * @return The same builder so calls can be chained.
     */
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", RegisterAsync)
            .RequireAuthorization("AdminOnly")
            .Produces<RegisterResponse>(StatusCodes.Status200OK)
            .ProducesValidationProblem(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        group.MapPost("/login", LoginAsync)
            .RequireRateLimiting("AuthLoginAttempts")
            .Produces<LoginResponse>(StatusCodes.Status200OK)
            .ProducesValidationProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .Produces<object>(StatusCodes.Status429TooManyRequests);

        group.MapPost("/refresh", RefreshAsync)
            .RequireRateLimiting("AuthRefreshAttempts")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status429TooManyRequests);

        group.MapPost("/logout", LogoutAsync)
            .RequireAuthorization()
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/validate", ValidateTokenAsync)
            .RequireAuthorization()
            .Produces<ValidateTokenResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return endpoints;
    }
}