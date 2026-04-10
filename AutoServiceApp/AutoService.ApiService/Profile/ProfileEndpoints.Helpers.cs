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

    private static bool TryDetectImageContentType(ReadOnlySpan<byte> fileBytes, out string contentType)
    {
        if (IsJpeg(fileBytes))
        {
            contentType = "image/jpeg";
            return true;
        }

        if (IsPng(fileBytes))
        {
            contentType = "image/png";
            return true;
        }

        if (IsWebP(fileBytes))
        {
            contentType = "image/webp";
            return true;
        }

        contentType = string.Empty;
        return false;
    }

    private static bool IsJpeg(ReadOnlySpan<byte> fileBytes)
        => fileBytes.Length >= 4 &&
           fileBytes[0] == 0xFF &&
           fileBytes[1] == 0xD8 &&
           fileBytes[2] == 0xFF &&
           fileBytes[^2] == 0xFF &&
           fileBytes[^1] == 0xD9;

    private static bool IsPng(ReadOnlySpan<byte> fileBytes)
        => fileBytes.Length >= 8 &&
           fileBytes[0] == 0x89 &&
           fileBytes[1] == 0x50 &&
           fileBytes[2] == 0x4E &&
           fileBytes[3] == 0x47 &&
           fileBytes[4] == 0x0D &&
           fileBytes[5] == 0x0A &&
           fileBytes[6] == 0x1A &&
           fileBytes[7] == 0x0A;

    private static bool IsWebP(ReadOnlySpan<byte> fileBytes)
        => fileBytes.Length >= 12 &&
           fileBytes[0] == 0x52 &&
           fileBytes[1] == 0x49 &&
           fileBytes[2] == 0x46 &&
           fileBytes[3] == 0x46 &&
           fileBytes[8] == 0x57 &&
           fileBytes[9] == 0x45 &&
           fileBytes[10] == 0x42 &&
           fileBytes[11] == 0x50;
}
