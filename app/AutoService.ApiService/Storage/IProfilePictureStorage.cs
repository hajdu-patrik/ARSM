namespace AutoService.ApiService.Storage;

/**
 * Abstraction over the object store that holds processed profile pictures.
 *
 * Implementations must never leak provider-specific types so MinIO, Cloudflare R2,
 * and AWS S3 stay interchangeable behind the same contract.
 */
public interface IProfilePictureStorage
{
    /**
     * Uploads processed picture bytes under a freshly generated object key.
     *
     * @param personId Owning person identifier, used as the key prefix.
     * @param content Processed image bytes.
     * @param contentType MIME type stored alongside the object.
     * @param cancellationToken Cancellation token.
     * @return The object key the caller must persist.
     */
    Task<string> SaveAsync(int personId, byte[] content, string contentType, CancellationToken cancellationToken);

    /**
     * Opens a readable stream for an object key.
     *
     * @param objectKey Stored object key.
     * @param cancellationToken Cancellation token.
     * @return A stream the caller owns and must dispose, or null when the object is gone.
     */
    Task<Stream?> OpenReadAsync(string objectKey, CancellationToken cancellationToken);

    /**
     * Deletes an object key, treating an already missing object as success.
     *
     * @param objectKey Stored object key.
     * @param cancellationToken Cancellation token.
     */
    Task DeleteAsync(string objectKey, CancellationToken cancellationToken);

    /**
     * Reads an object's size without transferring its body.
     *
     * Used by the storage backfill verification pass to prove that every persisted object key
     * resolves to a real, non-empty object.
     *
     * @param objectKey Stored object key.
     * @param cancellationToken Cancellation token.
     * @return Object size in bytes, or null when the object does not exist.
     */
    Task<long?> GetObjectSizeAsync(string objectKey, CancellationToken cancellationToken);
}
