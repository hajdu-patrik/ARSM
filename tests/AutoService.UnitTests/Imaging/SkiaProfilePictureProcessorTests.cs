using System.Text;
using AutoService.ApiService.Imaging;
using SkiaSharp;

namespace AutoService.UnitTests.Imaging;

/** Every accepted format leaves as a WebP bounded to 512x512 with a content ETag; bad input is refused. */
public sealed class SkiaProfilePictureProcessorTests
{
    private readonly SkiaProfilePictureProcessor processor = new();

    private Task<ProcessedProfilePicture> Process(byte[] content) =>
        processor.ProcessAsync(new MemoryStream(content), CancellationToken.None);

    private static bool IsWebP(byte[] bytes) =>
        bytes.Length > 12
        && Encoding.ASCII.GetString(bytes, 0, 4) == "RIFF"
        && Encoding.ASCII.GetString(bytes, 8, 4) == "WEBP";

    [Theory]
    [InlineData(SKEncodedImageFormat.Png)]
    [InlineData(SKEncodedImageFormat.Jpeg)]
    [InlineData(SKEncodedImageFormat.Webp)]
    public async Task Each_accepted_input_format_comes_out_as_webp(SKEncodedImageFormat format)
    {
        var result = await Process(ImageFixtures.Encode(64, 48, format));

        Assert.Equal("image/webp", result.ContentType);
        Assert.True(IsWebP(result.Bytes));
    }

    [Fact]
    public async Task A_small_image_keeps_its_size_and_is_never_upscaled()
    {
        var result = await Process(ImageFixtures.Encode(100, 50, SKEncodedImageFormat.Png));

        Assert.Equal((100, 50), ImageFixtures.SizeOf(result.Bytes));
    }

    [Fact]
    public async Task A_wide_image_is_shrunk_to_512_on_its_long_edge_keeping_the_ratio()
    {
        var result = await Process(ImageFixtures.Encode(1024, 512, SKEncodedImageFormat.Png));

        Assert.Equal((512, 256), ImageFixtures.SizeOf(result.Bytes));
    }

    [Fact]
    public async Task A_tall_image_is_shrunk_to_512_on_its_height()
    {
        var result = await Process(ImageFixtures.Encode(300, 1000, SKEncodedImageFormat.Png));

        var (width, height) = ImageFixtures.SizeOf(result.Bytes);
        Assert.Equal(512, height);
        Assert.InRange(width, 153, 154);
    }

    [Fact]
    public async Task An_image_exactly_512_square_is_left_at_that_size()
    {
        var result = await Process(ImageFixtures.Encode(512, 512, SKEncodedImageFormat.Jpeg));

        Assert.Equal((512, 512), ImageFixtures.SizeOf(result.Bytes));
    }

    [Fact]
    public async Task The_etag_is_a_quoted_sha256_hex_of_the_output_and_is_stable()
    {
        var input = ImageFixtures.Encode(64, 64, SKEncodedImageFormat.Png);

        var first = await Process(input);
        var second = await Process(input);

        Assert.Equal(first.ETag, second.ETag);
        Assert.Matches("^\"[0-9A-F]{64}\"$", first.ETag);
        Assert.Equal(
            $"\"{Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(first.Bytes))}\"",
            first.ETag);
    }

    [Fact]
    public async Task Different_pictures_get_different_etags()
    {
        var small = await Process(ImageFixtures.Encode(64, 64, SKEncodedImageFormat.Png));
        var large = await Process(ImageFixtures.Encode(128, 96, SKEncodedImageFormat.Png));

        Assert.NotEqual(small.ETag, large.ETag);
    }

    [Fact]
    public async Task A_stream_left_at_its_end_is_rewound_before_decoding()
    {
        using var stream = new MemoryStream(ImageFixtures.Encode(32, 32, SKEncodedImageFormat.Png));
        stream.Seek(0, SeekOrigin.End);

        var result = await processor.ProcessAsync(stream, CancellationToken.None);

        Assert.True(IsWebP(result.Bytes));
    }

    [Fact]
    public async Task A_stream_that_cannot_seek_is_decoded_too()
    {
        using var stream = new ForwardOnlyStream(ImageFixtures.Encode(32, 32, SKEncodedImageFormat.Png));

        var result = await processor.ProcessAsync(stream, CancellationToken.None);

        Assert.True(IsWebP(result.Bytes));
    }

    [Fact]
    public async Task Random_bytes_are_refused_with_a_caller_facing_message()
    {
        var garbage = Enumerable.Range(0, 400).Select(i => (byte)(i * 31 % 251)).ToArray();

        var error = await Assert.ThrowsAsync<ProfilePictureProcessingException>(() => Process(garbage));

        Assert.Equal("Image could not be read.", error.Message);
    }

    [Fact]
    public async Task An_empty_stream_is_refused()
    {
        await Assert.ThrowsAsync<ProfilePictureProcessingException>(() => Process([]));
    }

    [Fact]
    public async Task A_cancelled_token_stops_the_work_before_any_decoding()
    {
        using var cancelled = new CancellationTokenSource();
        await cancelled.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            processor.ProcessAsync(new MemoryStream(ImageFixtures.Encode(32, 32, SKEncodedImageFormat.Png)), cancelled.Token));
    }
}
