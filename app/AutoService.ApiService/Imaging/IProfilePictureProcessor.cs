namespace AutoService.ApiService.Imaging;

/**
 * Result of normalising an uploaded profile picture into the stored representation.
 *
 * @param Bytes Re-encoded image payload.
 * @param ContentType MIME type of the re-encoded payload.
 * @param ETag Strong ETag computed over the re-encoded payload.
 */
public sealed record ProcessedProfilePicture(byte[] Bytes, string ContentType, string ETag);

/**
 * Normalises uploaded profile pictures into a single stored format.
 *
 * Re-encoding is also a security boundary: metadata and any payload embedded in the
 * uploaded file are dropped because only decoded pixels survive the round trip.
 */
public interface IProfilePictureProcessor
{
    /**
     * Decodes, resizes, and re-encodes a profile picture.
     *
     * @param source Readable stream positioned at the start of the uploaded image.
     * @param cancellationToken Cancellation token.
     * @return The re-encoded payload with its content type and ETag.
     * @throws ProfilePictureProcessingException When the image cannot be decoded or exceeds the pixel guard.
     */
    Task<ProcessedProfilePicture> ProcessAsync(Stream source, CancellationToken cancellationToken);
}
