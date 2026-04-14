/**
 * ProfileEndpoints.Helpers.cs
 *
 * Auto-generated documentation header for this source file.
 */

using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace AutoService.ApiService.Profile.Endpoints;

/**
 * Backend type for API logic in this file.
 */
public static partial class ProfileEndpoints
{
    private const int MaxProfilePictureBytes = 512 * 1024; // 512 KB

        private static async Task<People?> ResolveCurrentPersonAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var personIdClaim = httpContext.User.FindFirst("person_id")?.Value;
        if (!int.TryParse(personIdClaim, out var personId))
        {
            return null;
        }

        return await db.People.FirstOrDefaultAsync(p => p.Id == personId, cancellationToken);
    }

}
