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
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading.Channels;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    private static readonly TimeSpan ProfilePictureUpdatesIdleTimeout = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan ProfilePictureUpdatesKeepAliveInterval = TimeSpan.FromSeconds(20);
    private const int ProfilePictureCacheMaxAgeSeconds = 3600;

    /**
     * Represents the possible outcomes when waiting for the next profile-picture SSE channel item.
     */
    private enum ProfilePictureUpdateReadState
    {
        Available,
        Closed,
        TimedOut
    }

    /**
     * Handles {@code GET /api/profile/picture} to retrieve the current user's profile picture.
     * @param httpContext - Current HTTP context.
     * @param db - Database context.
     * @param cancellationToken - Cancellation token.
     * @return Profile picture binary with ETag support, or 404 if not found.
     */
    private static async Task<IResult> GetProfilePictureAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken, trackChanges: false);
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

        var etag = BuildProfilePictureEtag(person.ProfilePicture);
        AppendProfilePictureCacheHeaders(httpContext.Response, etag);

        if (IsNotModified(httpContext.Request, etag))
        {
            return Results.StatusCode(StatusCodes.Status304NotModified);
        }

        return Results.File(
            person.ProfilePicture,
            person.ProfilePictureContentType,
            fileDownloadName: $"profile-{person.Id}",
            enableRangeProcessing: false);
    }

    /**
     * Handles {@code GET /api/profile/picture/{personId}} to retrieve a mechanic's profile picture.
     * @param personId - Target mechanic's person ID.
     * @param httpContext - Current HTTP context.
     * @param db - Database context.
     * @param cancellationToken - Cancellation token.
     * @return Profile picture binary with ETag support, 403 if forbidden, or 404 if not found.
     */
    private static async Task<IResult> GetMechanicProfilePictureAsync(
        int personId,
        HttpContext httpContext,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var currentPerson = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken, trackChanges: false);
        if (currentPerson is null)
        {
            return Results.Problem(
                detail: "Linked person record not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var isAdmin = httpContext.User.IsInRole("Admin");
        if (!isAdmin && currentPerson.Id != personId)
        {
            return Results.Forbid();
        }

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

        var etag = BuildProfilePictureEtag(mechanic.ProfilePicture);
        AppendProfilePictureCacheHeaders(httpContext.Response, etag);

        if (IsNotModified(httpContext.Request, etag))
        {
            return Results.StatusCode(StatusCodes.Status304NotModified);
        }

        return Results.File(
            mechanic.ProfilePicture,
            mechanic.ProfilePictureContentType,
            fileDownloadName: $"profile-{mechanic.Id}",
            enableRangeProcessing: false);
    }

    /**
     * Handles {@code GET /api/profile/picture/updates} SSE stream for real-time profile picture updates.
     * @param httpContext - Current HTTP context.
     * @param broadcaster - Profile picture update broadcaster service.
     * @param cancellationToken - Cancellation token.
     * @return SSE stream with {@code profile-picture-updated} events, or 503 if subscription limit reached.
     */
    private static async Task<IResult> StreamProfilePictureUpdatesAsync(
        HttpContext httpContext,
        IProfilePictureUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var personIdClaim = httpContext.User.FindFirst("person_id")?.Value;
        var userId = int.TryParse(personIdClaim, out var parsedPersonId) ? parsedPersonId : 0;

        if (!broadcaster.TrySubscribe(userId, out var subscriptionId, out var reader))
        {
            return Results.Problem(
                detail: "Too many active profile picture update subscriptions. Please retry later.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        ConfigureProfilePictureUpdateStream(httpContext.Response);

        try
        {
            await WriteProfilePictureUpdateStreamAsync(httpContext.Response, reader, cancellationToken);
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

    /**
     * Configures SSE-specific response headers before the profile-picture update stream starts writing.
     */
    private static void ConfigureProfilePictureUpdateStream(HttpResponse response)
    {
        response.Headers.CacheControl = "no-cache";
        response.Headers.Append("X-Accel-Buffering", "no");
        response.ContentType = "text/event-stream";
    }

    /**
     * Writes profile-picture SSE events until the channel closes, the client disconnects, or the idle timeout expires.
     */
    private static async Task WriteProfilePictureUpdateStreamAsync(
        HttpResponse response,
        ChannelReader<ProfilePictureUpdatedEvent> reader,
        CancellationToken cancellationToken)
    {
        var idleDeadlineUtc = DateTime.UtcNow.Add(ProfilePictureUpdatesIdleTimeout);

        await WriteProfilePictureStreamCommentAsync(
            response,
            "profile picture updates stream ready",
            cancellationToken);

        while (!cancellationToken.IsCancellationRequested)
        {
            var readState = await WaitForProfilePictureUpdateAsync(reader, cancellationToken);

            if (readState == ProfilePictureUpdateReadState.Closed)
            {
                break;
            }

            if (readState == ProfilePictureUpdateReadState.TimedOut)
            {
                if (DateTime.UtcNow >= idleDeadlineUtc)
                {
                    break;
                }

                await WriteProfilePictureStreamCommentAsync(response, "keep-alive", cancellationToken);
                continue;
            }

            idleDeadlineUtc = await WriteAvailableProfilePictureUpdatesAsync(
                response,
                reader,
                idleDeadlineUtc,
                cancellationToken);
        }
    }

    /**
     * Waits for the next SSE update while distinguishing channel closure from keep-alive timeouts.
     */
    private static async Task<ProfilePictureUpdateReadState> WaitForProfilePictureUpdateAsync(
        ChannelReader<ProfilePictureUpdatedEvent> reader,
        CancellationToken cancellationToken)
    {
        using var readCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        readCts.CancelAfter(ProfilePictureUpdatesKeepAliveInterval);

        try
        {
            var hasData = await reader.WaitToReadAsync(readCts.Token);
            return hasData ? ProfilePictureUpdateReadState.Available : ProfilePictureUpdateReadState.Closed;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return ProfilePictureUpdateReadState.TimedOut;
        }
    }

    /**
     * Drains queued profile-picture updates and extends the stream idle deadline after each delivered event.
     */
    private static async Task<DateTime> WriteAvailableProfilePictureUpdatesAsync(
        HttpResponse response,
        ChannelReader<ProfilePictureUpdatedEvent> reader,
        DateTime idleDeadlineUtc,
        CancellationToken cancellationToken)
    {
        while (reader.TryRead(out var update))
        {
            var payload = JsonSerializer.Serialize(update);
            await response.WriteAsync($"event: profile-picture-updated\ndata: {payload}\n\n", cancellationToken);
            await response.Body.FlushAsync(cancellationToken);
            idleDeadlineUtc = DateTime.UtcNow.Add(ProfilePictureUpdatesIdleTimeout);
        }

        return idleDeadlineUtc;
    }

    /**
     * Writes an SSE comment frame used for stream readiness and keep-alive messages.
     */
    private static async Task WriteProfilePictureStreamCommentAsync(
        HttpResponse response,
        string comment,
        CancellationToken cancellationToken)
    {
        await response.WriteAsync($": {comment}\n\n", cancellationToken);
        await response.Body.FlushAsync(cancellationToken);
    }

    /**
     * Handles profile-picture uploads with metadata validation, byte-level image validation, and tracked persistence.
     */
    private static async Task<IResult> UploadProfilePictureAsync(
        [FromForm] IFormFile file,
        HttpContext httpContext,
        AutoServiceDbContext db,
        IProfilePictureUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var metadataValidationResult = ValidateProfilePictureUploadMetadata(file);
        if (metadataValidationResult is not null)
        {
            return metadataValidationResult;
        }

        var normalizedContentType = file.ContentType.ToLowerInvariant();
        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken);
        if (person is null)
        {
            return Results.Problem(
                detail: "Linked person record not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var fileBytes = await ReadProfilePictureFileBytesAsync(file, cancellationToken);
        var contentValidationResult = ValidateProfilePictureBytes(fileBytes, normalizedContentType);
        if (contentValidationResult is not null)
        {
            return contentValidationResult;
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

    /**
     * Validates upload metadata before reading the profile-picture file into memory.
     */
    private static IResult? ValidateProfilePictureUploadMetadata(IFormFile file)
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

        return null;
    }

    /**
     * Reads the already size-validated profile-picture file bytes for content inspection and persistence.
     */
    private static async Task<byte[]> ReadProfilePictureFileBytesAsync(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream, cancellationToken);
        return memoryStream.ToArray();
    }

    /**
     * Validates the uploaded image bytes against the declared profile-picture content type.
     */
    private static IResult? ValidateProfilePictureBytes(byte[] fileBytes, string normalizedContentType)
    {
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

        return null;
    }

    /**
     * Removes the tracked user's profile picture and publishes the realtime state change after persistence.
     */
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

    /**
     * Builds a strong ETag from the binary profile picture payload.
     */
    private static string BuildProfilePictureEtag(byte[] pictureBytes)
    {
        var hash = SHA256.HashData(pictureBytes);
        return $"\"{Convert.ToHexString(hash)}\"";
    }

    /**
     * Appends private browser-cache headers used by both authenticated profile-picture GET endpoints.
     */
    private static void AppendProfilePictureCacheHeaders(HttpResponse response, string etag)
    {
        response.Headers.CacheControl = $"private, max-age={ProfilePictureCacheMaxAgeSeconds}";
        response.Headers.ETag = etag;
        response.Headers.Append("Vary", "Cookie, Authorization");
    }

    /**
     * Evaluates If-None-Match values and returns true when the current ETag matches.
     */
    private static bool IsNotModified(HttpRequest request, string currentEtag)
    {
        if (!request.Headers.TryGetValue("If-None-Match", out var incomingValues))
        {
            return false;
        }

        foreach (var incomingValue in incomingValues)
        {
            if (string.IsNullOrWhiteSpace(incomingValue))
            {
                continue;
            }

            foreach (var token in incomingValue.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (token == "*" || string.Equals(token, currentEtag, StringComparison.Ordinal))
                {
                    return true;
                }
            }
        }

        return false;
    }
}
