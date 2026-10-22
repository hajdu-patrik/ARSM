using System.Security.Claims;

namespace AutoService.ApiService.Identity;

/** The claim that links an access token to its People row: JwtTokenIssuer writes it, handlers read the caller from it. */
internal static class PersonIdClaim
{
    internal const string Type = "person_id";

    internal static bool TryGetPersonId(this ClaimsPrincipal user, out int personId)
        => int.TryParse(user.FindFirst(Type)?.Value, out personId);

    /** The caller's person id, or 0 (no row ever has it) when the claim is missing, for lookups that answer 404 then. */
    internal static int GetPersonIdOrDefault(this ClaimsPrincipal user)
        => user.TryGetPersonId(out var personId) ? personId : 0;
}
