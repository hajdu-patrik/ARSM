using AutoService.ApiService.Data;
using AutoService.ApiService.Profile.Realtime;
using AutoService.ApiService.Storage;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Threading.Channels;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    private static readonly TimeSpan ProfilePictureUpdatesIdleTimeout = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan ProfilePictureUpdatesKeepAliveInterval = TimeSpan.FromSeconds(20);
    private const int ProfilePictureCacheMaxAgeSeconds = 3600;
    private const string DefaultProfilePictureContentType = "image/webp";

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
     * @param storage - Profile picture object storage.
     * @param cancellationToken - Cancellation token.
     * @return Profile picture binary with ETag support, or 404 if not found.
     */
    private static async Task<IResult> GetProfilePictureAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        IProfilePictureStorage storage,
        CancellationToken cancellationToken)
    {
        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken, trackChanges: false);
        if (person is null)
        {
            return Results.Problem(
                detail: "Linked person record not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        return await RespondWithProfilePictureAsync(httpContext, storage, person, cancellationToken);
    }

    /**
     * Handles {@code GET /api/profile/picture/{personId}} to retrieve a mechanic's profile picture.
     * @param personId - Target mechanic's person ID.
     * @param httpContext - Current HTTP context.
     * @param db - Database context.
     * @param storage - Profile picture object storage.
     * @param cancellationToken - Cancellation token.
     * @return Profile picture binary with ETag support, 403 if forbidden, or 404 if not found.
     */
    private static async Task<IResult> GetMechanicProfilePictureAsync(
        int personId,
        HttpContext httpContext,
        AutoServiceDbContext db,
        IProfilePictureStorage storage,
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

        return await RespondWithProfilePictureAsync(httpContext, storage, mechanic, cancellationToken);
    }

    /**
     * Serves a person's profile picture from object storage.
     *
     * The ETag is read from the person row, so a conditional request short-circuits to 304 without
     * ever calling the object store.
     *
     * @param httpContext - Current HTTP context.
     * @param storage - Profile picture object storage.
     * @param person - Person whose picture is requested.
     * @param cancellationToken - Cancellation token.
     * @return Picture stream, 304 when unchanged, or 404 when the person has no picture.
     */
    private static async Task<IResult> RespondWithProfilePictureAsync(
        HttpContext httpContext,
        IProfilePictureStorage storage,
        People person,
        CancellationToken cancellationToken)
    {
        if (person.ProfilePictureObjectKey is not null && person.ProfilePictureETag is not null)
        {
            AppendProfilePictureCacheHeaders(httpContext.Response, person.ProfilePictureETag);

            if (IsNotModified(httpContext.Request, person.ProfilePictureETag))
            {
                return Results.StatusCode(StatusCodes.Status304NotModified);
            }

            var content = await storage.OpenReadAsync(person.ProfilePictureObjectKey, cancellationToken);
            if (content is null)
            {
                return Results.NotFound();
            }

            return Results.Stream(
                content,
                person.ProfilePictureContentType ?? DefaultProfilePictureContentType,
                fileDownloadName: $"profile-{person.Id}",
                enableRangeProcessing: false);
        }

        return Results.NotFound();
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
