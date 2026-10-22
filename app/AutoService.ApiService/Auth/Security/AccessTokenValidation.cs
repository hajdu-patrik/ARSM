using System.IdentityModel.Tokens.Jwt;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace AutoService.ApiService.Auth.Security;

/** The revocation checks a signature-valid access token still has to pass: a denylisted JTI (logout,
    password change) or an issue time before the person's session cutoff (deletion, reset, lockout). */
internal static class AccessTokenValidation
{
    internal static async Task OnTokenValidatedAsync(TokenValidatedContext context)
    {
        var principal = context.Principal;
        if (principal is null)
        {
            return;
        }

        var services = context.HttpContext.RequestServices;
        var cancellationToken = context.HttpContext.RequestAborted;
        var jwtId = principal.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;

        try
        {
            if (!string.IsNullOrWhiteSpace(jwtId) &&
                await services.GetRequiredService<ITokenDenylistService>().IsRevokedAsync(jwtId, cancellationToken))
            {
                context.Fail("Token has been revoked.");
                return;
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return;
        }

        var issuedAt = TokenSecurity.ParseJwtIssuedAt(principal);
        if (principal.TryGetPersonId(out var personId) && issuedAt.HasValue &&
            services.GetRequiredService<ISessionRevocationService>().IsRevoked(personId, issuedAt.Value))
        {
            context.Fail("Token was issued before the session was revoked.");
        }
    }
}
