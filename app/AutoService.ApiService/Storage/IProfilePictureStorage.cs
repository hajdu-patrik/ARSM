namespace AutoService.ApiService.Storage;

/** Abstraction over the object store that holds processed profile pictures. Implementations must never leak provider-specific types so S3-compatible stores (RustFS, Cloudflare R2, AWS S3) and Azure Blob Storage stay interchangeable behind the same contract. */
public interface IProfilePictureStorage
{
    /** Uploads processed picture bytes under a freshly generated object key. */
    Task<string> SaveAsync(int personId, byte[] content, string contentType, CancellationToken cancellationToken);

    /** Opens a readable stream for an object key. */
    Task<Stream?> OpenReadAsync(string objectKey, CancellationToken cancellationToken);

    /** Deletes an object key, treating an already missing object as success. */
    Task DeleteAsync(string objectKey, CancellationToken cancellationToken);

    /** Reads an object's size without transferring its body. Used by the storage backfill verification pass to prove that every persisted object key resolves to a real, non-empty object. */
    Task<long?> GetObjectSizeAsync(string objectKey, CancellationToken cancellationToken);
}
