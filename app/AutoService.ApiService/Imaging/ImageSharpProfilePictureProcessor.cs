using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;
using System.Security.Cryptography;

namespace AutoService.ApiService.Imaging;

/**
 * ImageSharp-based profile-picture processor producing 512x512-bounded WebP output.
 *
 * Pixel dimensions are inspected before decoding: a small, heavily compressed file can
 * expand to gigabytes of bitmap memory, so the guard has to run on the header rather
 * than on the decoded image.
 */
internal sealed class ImageSharpProfilePictureProcessor : IProfilePictureProcessor
{
    private const int MaxOutputEdgePixels = 512;
    private const int MaxSourcePixelCount = 50_000_000;
    private const int WebpQuality = 80;
    private const string OutputContentType = "image/webp";

    /**
     * Decodes the upload, bounds it to 512x512, and re-encodes it as WebP with a content ETag.
     */
    public async Task<ProcessedProfilePicture> ProcessAsync(Stream source, CancellationToken cancellationToken)
    {
        await GuardSourceDimensionsAsync(source, cancellationToken);

        using var image = await LoadImageAsync(source, cancellationToken);

        image.Mutate(context =>
        {
            context.AutoOrient();

            if (image.Width > MaxOutputEdgePixels || image.Height > MaxOutputEdgePixels)
            {
                context.Resize(new ResizeOptions
                {
                    Size = new Size(MaxOutputEdgePixels, MaxOutputEdgePixels),
                    Mode = ResizeMode.Max
                });
            }
        });

        using var output = new MemoryStream();
        await image.SaveAsWebpAsync(output, new WebpEncoder { Quality = WebpQuality }, cancellationToken);

        var bytes = output.ToArray();

        return new ProcessedProfilePicture(bytes, OutputContentType, BuildETag(bytes));
    }

    /**
     * Rejects decompression bombs by reading only the image header before any pixel allocation.
     */
    private static async Task GuardSourceDimensionsAsync(Stream source, CancellationToken cancellationToken)
    {
        RewindSource(source);

        ImageInfo imageInfo;
        try
        {
            imageInfo = await Image.IdentifyAsync(source, cancellationToken);
        }
        catch (Exception exception) when (exception is UnknownImageFormatException or InvalidImageContentException)
        {
            throw new ProfilePictureProcessingException("Image could not be read.");
        }

        if ((long)imageInfo.Width * imageInfo.Height > MaxSourcePixelCount)
        {
            throw new ProfilePictureProcessingException(
                $"Image dimensions exceed the maximum of {MaxSourcePixelCount / 1_000_000} megapixels.");
        }
    }

    /**
     * Decodes the image and converts decoder failures into caller-facing rejections.
     */
    private static async Task<Image> LoadImageAsync(Stream source, CancellationToken cancellationToken)
    {
        RewindSource(source);

        try
        {
            return await Image.LoadAsync(source, cancellationToken);
        }
        catch (Exception exception) when (exception is UnknownImageFormatException or InvalidImageContentException)
        {
            throw new ProfilePictureProcessingException("Image could not be decoded.");
        }
    }

    /**
     * Rewinds a seekable source so header inspection and decoding both start at byte zero.
     */
    private static void RewindSource(Stream source)
    {
        if (source.CanSeek)
        {
            source.Seek(0, SeekOrigin.Begin);
        }
    }

    /**
     * Builds the strong ETag persisted with the object key so conditional GETs never touch the bucket.
     */
    private static string BuildETag(byte[] content)
        => $"\"{Convert.ToHexString(SHA256.HashData(content))}\"";
}
