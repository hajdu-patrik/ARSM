using SkiaSharp;
using System.Security.Cryptography;

namespace AutoService.ApiService.Imaging;

/** SkiaSharp-based processor producing 512x512-bounded WebP output. Dimensions are checked from
    the header before decoding, since a small compressed file can decode into gigabytes of bitmap memory. */
internal sealed class SkiaProfilePictureProcessor : IProfilePictureProcessor
{
    private const int MaxOutputEdgePixels = 512;
    private const int MaxSourcePixelCount = 20_000_000;
    private const int WebpQuality = 80;
    private const string OutputContentType = "image/webp";

    // A 20-megapixel decode is 80 MB of pixels; two at once is what the 1 GiB container leaves room for.
    private const int MaxConcurrentDecodes = 2;
    private static readonly SemaphoreSlim DecodeSlots = new(MaxConcurrentDecodes, MaxConcurrentDecodes);

    /** Trilinear mipmapped sampling: the output only ever shrinks, and mipmaps keep large reductions alias-free. */
    private static readonly SKSamplingOptions ResizeSampling = new(SKFilterMode.Linear, SKMipmapMode.Linear);

    /** Decodes the upload, bounds it to 512x512, and re-encodes it as WebP with a content ETag. */
    public async Task<ProcessedProfilePicture> ProcessAsync(Stream source, CancellationToken cancellationToken)
    {
        await DecodeSlots.WaitAsync(cancellationToken);

        try
        {
            return Process(source, cancellationToken);
        }
        finally
        {
            DecodeSlots.Release();
        }
    }

    private static ProcessedProfilePicture Process(Stream source, CancellationToken cancellationToken)
    {
        using var codec = CreateCodec(source);
        GuardSourceDimensions(codec.Info);
        cancellationToken.ThrowIfCancellationRequested();

        using var decoded = DecodeBitmap(codec);
        cancellationToken.ThrowIfCancellationRequested();

        using var output = RenderOutput(decoded, codec.EncodedOrigin);
        cancellationToken.ThrowIfCancellationRequested();

        var bytes = EncodeWebp(output);

        return new ProcessedProfilePicture(bytes, OutputContentType, BuildETag(bytes));
    }

    /** Opens a codec that reads only the image header; the caller keeps ownership of the source stream. */
    private static SKCodec CreateCodec(Stream source)
    {
        RewindSource(source);

        SKStream wrapped = source.CanSeek
            ? new SKManagedStream(source, disposeManagedStream: false)
            : new SKFrontBufferedManagedStream(source, SKCodec.MinBufferedBytesNeeded, disposeUnderlyingStream: false);

        return SKCodec.Create(wrapped, out _)
            ?? throw new ProfilePictureProcessingException("Image could not be read.");
    }

    /** Rejects decompression bombs from the header dimensions before any pixel allocation. */
    private static void GuardSourceDimensions(SKImageInfo headerInfo)
    {
        if ((long)headerInfo.Width * headerInfo.Height > MaxSourcePixelCount)
        {
            throw new ProfilePictureProcessingException(
                $"Image dimensions exceed the maximum of {MaxSourcePixelCount / 1_000_000} megapixels.");
        }
    }

    /** Decodes into 32-bit premultiplied pixels in the source colour space, rejecting corrupt data. */
    private static SKBitmap DecodeBitmap(SKCodec codec)
    {
        var headerInfo = codec.Info;
        var alphaType = headerInfo.AlphaType == SKAlphaType.Opaque ? SKAlphaType.Opaque : SKAlphaType.Premul;
        var decodeInfo = new SKImageInfo(
            headerInfo.Width, headerInfo.Height, SKImageInfo.PlatformColorType, alphaType, headerInfo.ColorSpace);

        return SKBitmap.Decode(codec, decodeInfo)
            ?? throw new ProfilePictureProcessingException("Image could not be decoded.");
    }

    /** Applies the EXIF orientation and the 512x512 bound in one draw, never upscaling. */
    private static SKBitmap RenderOutput(SKBitmap decoded, SKEncodedOrigin origin)
    {
        var swapsAxes = origin is SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightTop
            or SKEncodedOrigin.RightBottom or SKEncodedOrigin.LeftBottom;
        var orientedWidth = swapsAxes ? decoded.Height : decoded.Width;
        var orientedHeight = swapsAxes ? decoded.Width : decoded.Height;
        var outputSize = FitWithinOutputBounds(orientedWidth, orientedHeight);
        var orientation = CreateOrientationMatrix(origin, decoded.Width, decoded.Height);

        var output = new SKBitmap(decoded.Info.WithSize(outputSize.Width, outputSize.Height));
        using var canvas = new SKCanvas(output);
        canvas.Clear(SKColors.Transparent);
        canvas.Scale((float)outputSize.Width / orientedWidth, (float)outputSize.Height / orientedHeight);
        canvas.Concat(in orientation);
        canvas.DrawBitmap(decoded, 0, 0, ResizeSampling);
        canvas.Flush();

        return output;
    }

    /** Keeps the aspect ratio and shrinks only when an edge exceeds the bound. */
    private static SKSizeI FitWithinOutputBounds(int width, int height)
    {
        if (width <= MaxOutputEdgePixels && height <= MaxOutputEdgePixels)
        {
            return new SKSizeI(width, height);
        }

        var scale = Math.Min((double)MaxOutputEdgePixels / width, (double)MaxOutputEdgePixels / height);

        return new SKSizeI(
            Math.Max(1, (int)Math.Round(width * scale)),
            Math.Max(1, (int)Math.Round(height * scale)));
    }

    /** Maps stored pixel coordinates to display coordinates for each EXIF orientation value. */
    private static SKMatrix CreateOrientationMatrix(SKEncodedOrigin origin, int width, int height) => origin switch
    {
        SKEncodedOrigin.TopRight => new SKMatrix(-1, 0, width, 0, 1, 0, 0, 0, 1),
        SKEncodedOrigin.BottomRight => new SKMatrix(-1, 0, width, 0, -1, height, 0, 0, 1),
        SKEncodedOrigin.BottomLeft => new SKMatrix(1, 0, 0, 0, -1, height, 0, 0, 1),
        SKEncodedOrigin.LeftTop => new SKMatrix(0, 1, 0, 1, 0, 0, 0, 0, 1),
        SKEncodedOrigin.RightTop => new SKMatrix(0, -1, height, 1, 0, 0, 0, 0, 1),
        SKEncodedOrigin.RightBottom => new SKMatrix(0, -1, height, -1, 0, width, 0, 0, 1),
        SKEncodedOrigin.LeftBottom => new SKMatrix(0, 1, 0, -1, 0, width, 0, 0, 1),
        _ => SKMatrix.Identity
    };

    /** Encodes lossy WebP; a null result from the native encoder is reported like any other rejection. */
    private static byte[] EncodeWebp(SKBitmap bitmap)
    {
        using var pixmap = bitmap.PeekPixels();
        using var data = pixmap?.Encode(new SKWebpEncoderOptions(SKWebpEncoderCompression.Lossy, WebpQuality));

        return data?.ToArray() ?? throw new ProfilePictureProcessingException("Image could not be encoded.");
    }

    private static void RewindSource(Stream source)
    {
        if (source.CanSeek)
        {
            source.Seek(0, SeekOrigin.Begin);
        }
    }

    /** Builds the strong ETag persisted with the object key so conditional GETs never touch the bucket. */
    private static string BuildETag(byte[] content)
        => $"\"{Convert.ToHexString(SHA256.HashData(content))}\"";
}
