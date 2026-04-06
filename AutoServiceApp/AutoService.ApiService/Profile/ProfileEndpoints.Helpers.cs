using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace AutoService.ApiService.Profile;

public static partial class ProfileEndpoints
{
    private static readonly HashSet<string> AllowedImageContentTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

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

    private static string GetPersonType(People person) => person switch
    {
        Mechanic => "mechanic",
        Customer => "customer",
        _ => throw new InvalidOperationException("Unsupported person type.")
    };
}
