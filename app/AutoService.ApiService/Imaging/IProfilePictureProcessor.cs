namespace AutoService.ApiService.Imaging;

/** Result of normalising an uploaded profile picture into the stored representation. */
public sealed record ProcessedProfilePicture(byte[] Bytes, string ContentType, string ETag);

/** Normalises uploaded profile pictures into a single stored format. Re-encoding is also a security boundary: metadata and any payload embedded in the uploaded file are dropped because only decoded pixels survive the round trip. */
public interface IProfilePictureProcessor
{
    /** Decodes, resizes, and re-encodes a profile picture. */
    Task<ProcessedProfilePicture> ProcessAsync(Stream source, CancellationToken cancellationToken);
}
