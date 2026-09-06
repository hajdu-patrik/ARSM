using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    private const int MaxProfilePictureBytes = 4 * 1024 * 1024; // 4 MB

    // Multipart framing (boundary lines and part headers) travels with the file, so the
    // transport-level cap has to sit above the file cap; otherwise a valid 4 MB upload would be
    // rejected by the body limit before the endpoint could return a validation problem.
    private const int MaxProfilePictureRequestBytes = MaxProfilePictureBytes + (64 * 1024);

    /**
     * Resolves the authenticated person and allows read-only callers to skip EF change tracking.
     */
    private static async Task<People?> ResolveCurrentPersonAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        CancellationToken cancellationToken,
        bool trackChanges = true)
    {
        var personIdClaim = httpContext.User.FindFirst("person_id")?.Value;
        if (!int.TryParse(personIdClaim, out var personId))
        {
            return null;
        }

        var peopleQuery = trackChanges ? db.People : db.People.AsNoTracking();
        return await peopleQuery.FirstOrDefaultAsync(p => p.Id == personId, cancellationToken);
    }
}
