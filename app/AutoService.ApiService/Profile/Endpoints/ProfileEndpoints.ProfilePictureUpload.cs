using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Imaging;
using AutoService.ApiService.Profile.Realtime;
using AutoService.ApiService.Storage;
using AutoService.ApiService.Validation;
using Microsoft.AspNetCore.Mvc;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    /**
     * Handles profile-picture uploads: metadata validation, byte-level image validation,
     * re-encoding, object-storage upload, and tracked persistence.
     *
     * Ordering is deliberate. The new object is written first, the row second, and the replaced
     * object last, so a failed save never leaves the row pointing at a missing object. If the save
     * fails, the just-uploaded object is deleted; if the trailing delete fails, the orphan is only
     * logged because the user-visible operation already succeeded.
     *
     * @param file - Uploaded multipart file.
     * @param httpContext - Current HTTP context.
     * @param db - Database context.
     * @param processor - Profile picture normaliser.
     * @param storage - Profile picture object storage.
     * @param broadcaster - Profile picture update broadcaster service.
     * @param loggerFactory - Logger factory.
     * @param cancellationToken - Cancellation token.
     * @return 200 on success, 400 on invalid metadata, 422 on invalid content, or 404 when unlinked.
     */
    private static async Task<IResult> UploadProfilePictureAsync(
        [FromForm] IFormFile file,
        HttpContext httpContext,
        AutoServiceDbContext db,
        IProfilePictureProcessor processor,
        IProfilePictureStorage storage,
        IProfilePictureUpdateBroadcaster broadcaster,
        ILoggerFactory loggerFactory,
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

        ProcessedProfilePicture processed;
        try
        {
            using var sourceStream = new MemoryStream(fileBytes, writable: false);
            processed = await processor.ProcessAsync(sourceStream, cancellationToken);
        }
        catch (ProfilePictureProcessingException exception)
        {
            return Results.ValidationProblem(
                new Dictionary<string, string[]> { ["file"] = [exception.Message] },
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var logger = loggerFactory.CreateLogger("ProfileEndpoints.UploadProfilePicture");

        return await StoreProfilePictureAsync(
            new ProfilePictureStoreContext(db, storage, broadcaster, logger),
            person,
            processed,
            cancellationToken);
    }

    /**
     * Writes the processed picture to object storage and the person row, then drops the replaced object.
     */
    private static async Task<IResult> StoreProfilePictureAsync(
        ProfilePictureStoreContext context,
        People person,
        ProcessedProfilePicture processed,
        CancellationToken cancellationToken)
    {
        var replacedObjectKey = person.ProfilePictureObjectKey;

        var objectKey = await context.Storage.SaveAsync(
            person.Id,
            processed.Bytes,
            processed.ContentType,
            cancellationToken);

        try
        {
            person.ProfilePictureObjectKey = objectKey;
            person.ProfilePictureETag = processed.ETag;
            person.ProfilePictureContentType = processed.ContentType;

            await context.Db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await TryDeleteProfilePictureObjectAsync(context.Storage, objectKey, context.Logger);
            throw;
        }

        if (replacedObjectKey is not null)
        {
            await TryDeleteProfilePictureObjectAsync(context.Storage, replacedObjectKey, context.Logger);
        }

        context.Broadcaster.Publish(new ProfilePictureUpdatedEvent(
            person.Id,
            true,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()));

        return Results.Ok(new { message = "Profile picture updated." });
    }

    /**
     * Collaborators shared by the profile-picture write paths, kept together to stay under the
     * parameter counts the surrounding endpoint code uses.
     */
    private sealed record ProfilePictureStoreContext(
        AutoServiceDbContext Db,
        IProfilePictureStorage Storage,
        IProfilePictureUpdateBroadcaster Broadcaster,
        ILogger Logger);

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
                ["file"] = [$"File size exceeds the maximum allowed size of {MaxProfilePictureBytes / (1024 * 1024)} MB."]
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
     * Reads the already size-validated profile-picture file bytes for content inspection and processing.
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
     *
     * @param httpContext - Current HTTP context.
     * @param db - Database context.
     * @param storage - Profile picture object storage.
     * @param broadcaster - Profile picture update broadcaster service.
     * @param loggerFactory - Logger factory.
     * @param cancellationToken - Cancellation token.
     * @return 200 on success, or 404 when the caller is not linked to a person record.
     */
    private static async Task<IResult> DeleteProfilePictureAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        IProfilePictureStorage storage,
        IProfilePictureUpdateBroadcaster broadcaster,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken);
        if (person is null)
        {
            return Results.Problem(
                detail: "Linked person record not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var removedObjectKey = person.ProfilePictureObjectKey;

        person.ProfilePictureObjectKey = null;
        person.ProfilePictureETag = null;
        person.ProfilePictureContentType = null;

        await db.SaveChangesAsync(cancellationToken);

        if (removedObjectKey is not null)
        {
            await TryDeleteProfilePictureObjectAsync(
                storage,
                removedObjectKey,
                loggerFactory.CreateLogger("ProfileEndpoints.DeleteProfilePicture"));
        }

        broadcaster.Publish(new ProfilePictureUpdatedEvent(
            person.Id,
            false,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()));

        return Results.Ok(new { message = "Profile picture removed." });
    }

    /**
     * Deletes a stored object without failing the caller.
     *
     * Cleanup runs with an uncancellable token on purpose: it is also used on the rollback path,
     * where the request token may already be cancelled, and leaving the object behind there would
     * be worse than the extra call.
     */
    private static async Task TryDeleteProfilePictureObjectAsync(
        IProfilePictureStorage storage,
        string objectKey,
        ILogger logger)
    {
        try
        {
            await storage.DeleteAsync(objectKey, CancellationToken.None);
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                exception,
                "Failed to delete profile picture object '{ObjectKey}'; it stays orphaned in the bucket.",
                objectKey);
        }
    }
}
