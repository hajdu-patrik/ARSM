namespace AutoService.ApiService.Storage;

internal static class ProfilePictureObjectCleanup
{
    /** Deletes a stored object without failing the caller, using an uncancellable token because this
        also runs on the rollback path, where leaving the object orphaned would be worse than one extra call. */
    internal static async Task TryDeleteAsync(IProfilePictureStorage storage, string? objectKey, ILogger logger)
    {
        if (objectKey is null)
        {
            return;
        }

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
