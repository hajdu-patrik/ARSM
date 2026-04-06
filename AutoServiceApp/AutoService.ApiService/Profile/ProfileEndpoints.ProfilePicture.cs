using AutoService.ApiService.Data;
using Microsoft.AspNetCore.Mvc;

namespace AutoService.ApiService.Profile;

public static partial class ProfileEndpoints
{
    private static async Task<IResult> GetProfilePictureAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken);
        if (person is null)
        {
            return Results.Problem(
                detail: "Linked person record not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        if (person.ProfilePicture is null || person.ProfilePictureContentType is null)
        {
            return Results.NotFound();
        }

        return Results.File(
            person.ProfilePicture,
            person.ProfilePictureContentType,
            enableRangeProcessing: false);
    }

    private static async Task<IResult> UploadProfilePictureAsync(
        [FromForm] IFormFile file,
        HttpContext httpContext,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["file"] = ["File is empty."]
            });
        }

        if (file.Length > MaxProfilePictureBytes)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["file"] = [$"File size exceeds the maximum allowed size of {MaxProfilePictureBytes / 1024} KB."]
            });
        }

        if (!AllowedImageContentTypes.Contains(file.ContentType.ToLowerInvariant()))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["file"] = ["Only JPEG, PNG, and WebP images are allowed."]
            });
        }

        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken);
        if (person is null)
        {
            return Results.Problem(
                detail: "Linked person record not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream, cancellationToken);
        person.ProfilePicture = memoryStream.ToArray();
        person.ProfilePictureContentType = file.ContentType.ToLowerInvariant();

        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(new { message = "Profile picture updated." });
    }

    private static async Task<IResult> DeleteProfilePictureAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken);
        if (person is null)
        {
            return Results.Problem(
                detail: "Linked person record not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        person.ProfilePicture = null;
        person.ProfilePictureContentType = null;

        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(new { message = "Profile picture removed." });
    }
}
