using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

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

    private static async Task<IResult> GetMechanicProfilePictureAsync(
        int personId,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var mechanic = await db.People
            .AsNoTracking()
            .OfType<Mechanic>()
            .FirstOrDefaultAsync(p => p.Id == personId, cancellationToken);

        if (mechanic is null)
        {
            return Results.NotFound();
        }

        if (mechanic.ProfilePicture is null || mechanic.ProfilePictureContentType is null)
        {
            return Results.NotFound();
        }

        return Results.File(
            mechanic.ProfilePicture,
            mechanic.ProfilePictureContentType,
            enableRangeProcessing: false);
    }

    private static async Task StreamProfilePictureUpdatesAsync(
        HttpContext httpContext,
        IProfilePictureUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        httpContext.Response.Headers.CacheControl = "no-cache";
        httpContext.Response.Headers.Append("X-Accel-Buffering", "no");
        httpContext.Response.ContentType = "text/event-stream";

        var (subscriptionId, reader) = broadcaster.Subscribe();

        try
        {
            await httpContext.Response.WriteAsync(": profile picture updates stream ready\n\n", cancellationToken);
            await httpContext.Response.Body.FlushAsync(cancellationToken);

            await foreach (var update in reader.ReadAllAsync(cancellationToken))
            {
                var payload = JsonSerializer.Serialize(update);
                await httpContext.Response.WriteAsync($"event: profile-picture-updated\ndata: {payload}\n\n", cancellationToken);
                await httpContext.Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Client disconnected.
        }
        finally
        {
            broadcaster.Unsubscribe(subscriptionId);
        }
    }

    private static async Task<IResult> UploadProfilePictureAsync(
        [FromForm] IFormFile file,
        HttpContext httpContext,
        AutoServiceDbContext db,
        IProfilePictureUpdateBroadcaster broadcaster,
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

        broadcaster.Publish(new ProfilePictureUpdatedEvent(
            person.Id,
            true,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()));

        return Results.Ok(new { message = "Profile picture updated." });
    }

    private static async Task<IResult> DeleteProfilePictureAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        IProfilePictureUpdateBroadcaster broadcaster,
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

        broadcaster.Publish(new ProfilePictureUpdatedEvent(
            person.Id,
            false,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()));

        return Results.Ok(new { message = "Profile picture removed." });
    }
}
