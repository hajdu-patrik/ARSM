using AutoService.ApiService.Data;
using AutoService.ApiService.Profile.Realtime;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    private static readonly TimeSpan ProfilePictureUpdatesIdleTimeout = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan ProfilePictureUpdatesKeepAliveInterval = TimeSpan.FromSeconds(20);

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
            fileDownloadName: $"profile-{person.Id}",
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
            fileDownloadName: $"profile-{mechanic.Id}",
            enableRangeProcessing: false);
    }

    private static async Task<IResult> StreamProfilePictureUpdatesAsync(
        HttpContext httpContext,
        IProfilePictureUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        if (!broadcaster.TrySubscribe(out var subscriptionId, out var reader))
        {
            return Results.Problem(
                detail: "Too many active profile picture update subscriptions. Please retry later.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        httpContext.Response.Headers.CacheControl = "no-cache";
        httpContext.Response.Headers.Append("X-Accel-Buffering", "no");
        httpContext.Response.ContentType = "text/event-stream";
        var idleDeadlineUtc = DateTime.UtcNow.Add(ProfilePictureUpdatesIdleTimeout);

        try
        {
            await httpContext.Response.WriteAsync(": profile picture updates stream ready\n\n", cancellationToken);
            await httpContext.Response.Body.FlushAsync(cancellationToken);

            while (!cancellationToken.IsCancellationRequested)
            {
                using var readCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                readCts.CancelAfter(ProfilePictureUpdatesKeepAliveInterval);

                try
                {
                    var hasData = await reader.WaitToReadAsync(readCts.Token);
                    if (!hasData)
                    {
                        break;
                    }

                    while (reader.TryRead(out var update))
                    {
                        var payload = JsonSerializer.Serialize(update);
                        await httpContext.Response.WriteAsync($"event: profile-picture-updated\ndata: {payload}\n\n", cancellationToken);
                        await httpContext.Response.Body.FlushAsync(cancellationToken);
                        idleDeadlineUtc = DateTime.UtcNow.Add(ProfilePictureUpdatesIdleTimeout);
                    }
                }
                catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
                {
                    if (DateTime.UtcNow >= idleDeadlineUtc)
                    {
                        break;
                    }

                    await httpContext.Response.WriteAsync(": keep-alive\n\n", cancellationToken);
                    await httpContext.Response.Body.FlushAsync(cancellationToken);
                }
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

        return Results.Empty;
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

        var normalizedContentType = file.ContentType.ToLowerInvariant();

        if (!ImageContentTypeDetector.AllowedImageContentTypes.Contains(normalizedContentType))
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
        var fileBytes = memoryStream.ToArray();

        if (!ImageContentTypeDetector.TryDetect(fileBytes, out var detectedContentType))
        {
            return Results.ValidationProblem(
                new Dictionary<string, string[]>
                {
                    ["file"] = ["File content is not a valid JPEG, PNG, or WebP image."]
                },
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!string.Equals(detectedContentType, normalizedContentType, StringComparison.Ordinal))
        {
            return Results.ValidationProblem(
                new Dictionary<string, string[]>
                {
                    ["file"] = ["File content does not match the declared content type."]
                },
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        person.ProfilePicture = fileBytes;
        person.ProfilePictureContentType = normalizedContentType;

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
