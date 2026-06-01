using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    private const int MaxProfilePictureBytes = 512 * 1024; // 512 KB

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
