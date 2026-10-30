using AutoService.ApiService.Validation;

namespace AutoService.UnitTests.Validation;

/** Magic-byte detection decides the upload type; the client-declared type never counts. */
public sealed class ImageContentTypeDetectorTests
{
    private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    private static byte[] RiffContainer(string formType) =>
    [
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
        .. System.Text.Encoding.ASCII.GetBytes(formType),
        0x56, 0x50, 0x38, 0x20,
    ];

    [Fact]
    public void TryDetect_recognizes_a_jpeg_by_its_start_and_end_markers()
    {
        byte[] jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0xFF, 0xD9];

        Assert.True(ImageContentTypeDetector.TryDetect(jpeg, out var contentType));
        Assert.Equal("image/jpeg", contentType);
    }

    [Fact]
    public void TryDetect_recognizes_a_png_signature()
    {
        byte[] png = [.. PngSignature, 0, 0, 0, 13];

        Assert.True(ImageContentTypeDetector.TryDetect(png, out var contentType));
        Assert.Equal("image/png", contentType);
    }

    [Fact]
    public void TryDetect_recognizes_a_webp_riff_container()
    {
        Assert.True(ImageContentTypeDetector.TryDetect(RiffContainer("WEBP"), out var contentType));
        Assert.Equal("image/webp", contentType);
    }

    [Fact]
    public void TryDetect_rejects_a_riff_container_that_is_not_webp()
    {
        Assert.False(ImageContentTypeDetector.TryDetect(RiffContainer("WAVE"), out var contentType));
        Assert.Equal(string.Empty, contentType);
    }

    [Fact]
    public void TryDetect_rejects_a_truncated_jpeg_without_the_end_marker()
    {
        byte[] truncated = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46];

        Assert.False(ImageContentTypeDetector.TryDetect(truncated, out _));
    }

    [Fact]
    public void TryDetect_rejects_a_png_with_a_corrupted_signature()
    {
        var broken = PngSignature.ToArray();
        broken[4] = 0x0A;

        Assert.False(ImageContentTypeDetector.TryDetect(broken, out _));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(3)]
    [InlineData(7)]
    [InlineData(11)]
    public void TryDetect_rejects_inputs_shorter_than_any_signature(int length)
    {
        Assert.False(ImageContentTypeDetector.TryDetect(new byte[length], out var contentType));
        Assert.Equal(string.Empty, contentType);
    }

    [Fact]
    public void TryDetect_rejects_a_gif_and_a_windows_executable_renamed_to_an_image()
    {
        byte[] gif = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00];
        byte[] executable = [0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00];

        Assert.False(ImageContentTypeDetector.TryDetect(gif, out _));
        Assert.False(ImageContentTypeDetector.TryDetect(executable, out _));
    }

    [Fact]
    public void AllowedImageContentTypes_are_exactly_jpeg_png_and_webp()
    {
        Assert.Equal(
            new[] { "image/jpeg", "image/png", "image/webp" },
            ImageContentTypeDetector.AllowedImageContentTypes.OrderBy(type => type));
    }
}
