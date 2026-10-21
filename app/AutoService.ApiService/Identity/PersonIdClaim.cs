using System.Security.Claims;

namespace AutoService.ApiService.Identity;

/** The claim that links an access token to its People row: JwtTokenIssuer writes it, handlers read the caller from it. */
internal static class PersonIdClaim
{
    internal const string Type = "person_id";

    internal static bool TryGetPersonId(this ClaimsPrincipal user, out int personId)
        => int.TryParse(user.FindFirst(Type)?.Value, out personId);
}
