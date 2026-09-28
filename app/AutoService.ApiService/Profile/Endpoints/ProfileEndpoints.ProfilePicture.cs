using AutoService.ApiService.Data;
using AutoService.ApiService.Profile.Realtime;
using AutoService.ApiService.Realtime;
using AutoService.ApiService.Storage;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    private const int ProfilePictureCacheMaxAgeSeconds = 3600;
    private const string DefaultProfilePictureContentType = "image/webp";

    /** Handles {@code GET /api/profile/picture} to retrieve the current user's profile picture. */
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

    /** Handles {@code GET /api/profile/picture/{personId}} to retrieve a mechanic's profile picture. */
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

    /** Serves a person's profile picture from object storage. The ETag is read from the person row, so a conditional request short-circuits to 304 without ever calling the object store. */
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

    /** Handles {@code GET /api/profile/picture/updates} SSE stream for real-time profile picture updates. */
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

        ServerSentEventStream.ConfigureResponse(httpContext.Response);

        try
        {
            await ServerSentEventStream.WriteAsync(
                httpContext.Response,
                reader,
                "profile-picture-updated",
                "profile picture updates stream ready",
                cancellationToken);
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

    /** Appends private browser-cache headers used by both authenticated profile-picture GET endpoints. */
    private static void AppendProfilePictureCacheHeaders(HttpResponse response, string etag)
    {
        response.Headers.CacheControl = $"private, max-age={ProfilePictureCacheMaxAgeSeconds}";
        response.Headers.ETag = etag;
        response.Headers.Append("Vary", "Cookie, Authorization");
    }

    /** Evaluates If-None-Match values and returns true when the current ETag matches. */
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
