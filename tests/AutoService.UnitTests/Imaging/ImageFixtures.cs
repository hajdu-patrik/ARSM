using SkiaSharp;

namespace AutoService.UnitTests.Imaging;

/** Builds small, structurally valid images in memory for the profile picture processor tests. */
internal static class ImageFixtures
{
    internal static byte[] Encode(int width, int height, SKEncodedImageFormat format)
    {
        using var bitmap = new SKBitmap(width, height, SKColorType.Rgba8888, SKAlphaType.Opaque);
        bitmap.Erase(new SKColor(200, 60, 40));
        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(format, 90);
        return data.ToArray();
    }

    /** A blank 8-bit gray PNG: huge on paper, tiny in memory and on the wire. */
    internal static byte[] BlankGrayPng(int width, int height)
    {
        using var bitmap = new SKBitmap(width, height, SKColorType.Gray8, SKAlphaType.Opaque);
        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    /** Dimensions of an encoded image, read back from its header. */
    internal static (int Width, int Height) SizeOf(byte[] encoded)
    {
        using var codec = SKCodec.Create(new MemoryStream(encoded));
        return (codec.Info.Width, codec.Info.Height);
    }
}

/** A readable stream that cannot seek, like a request body. */
internal sealed class ForwardOnlyStream(byte[] content) : Stream
{
    private readonly MemoryStream inner = new(content);

    public override bool CanRead => true;

    public override bool CanSeek => false;

    public override bool CanWrite => false;

    public override long Length => throw new NotSupportedException();

    public override long Position
    {
        get => throw new NotSupportedException();
        set => throw new NotSupportedException();
    }

    public override int Read(byte[] buffer, int offset, int count) => inner.Read(buffer, offset, count);

    public override void Flush()
    {
    }

    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

    public override void SetLength(long value) => throw new NotSupportedException();

    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
}
