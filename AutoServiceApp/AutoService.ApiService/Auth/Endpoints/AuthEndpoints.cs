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

        group.MapPost("/register", RegisterAsync).RequireAuthorization("AdminOnly");
        group.MapPost("/login", LoginAsync).RequireRateLimiting("AuthLoginAttempts");
        group.MapPost("/refresh", RefreshAsync).RequireRateLimiting("AuthRefreshAttempts");
        group.MapPost("/logout", LogoutAsync).RequireAuthorization();
        group.MapGet("/validate", ValidateTokenAsync).RequireAuthorization();

        return endpoints;
    }
}