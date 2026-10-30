using AutoService.ApiService.Imaging;

namespace AutoService.UnitTests.Imaging;

/** The 20 megapixel guard reads the header dimensions, so a bomb is refused before any pixel is allocated. */
public sealed class ProfilePictureMegapixelGuardTests
{
    private const string TooLarge = "Image dimensions exceed the maximum of 20 megapixels.";

    private static Task<ProcessedProfilePicture> Process(byte[] content) =>
        new SkiaProfilePictureProcessor().ProcessAsync(new MemoryStream(content), CancellationToken.None);

    [Fact]
    public async Task An_image_one_row_over_20_megapixels_is_refused()
    {
        var oversized = ImageFixtures.BlankGrayPng(5000, 4001);

        var error = await Assert.ThrowsAsync<ProfilePictureProcessingException>(() => Process(oversized));

        Assert.Equal(TooLarge, error.Message);
    }

    [Fact]
    public async Task A_24_megapixel_image_is_refused_like_the_http_check_sends()
    {
        var oversized = ImageFixtures.BlankGrayPng(6000, 4000);

        var error = await Assert.ThrowsAsync<ProfilePictureProcessingException>(() => Process(oversized));

        Assert.Equal(TooLarge, error.Message);
    }

    [Fact]
    public async Task An_image_of_exactly_20_megapixels_is_still_processed()
    {
        var atLimit = ImageFixtures.BlankGrayPng(5000, 4000);

        var result = await Process(atLimit);

        Assert.Equal("image/webp", result.ContentType);
        Assert.Equal((512, 410), ImageFixtures.SizeOf(result.Bytes));
    }
}
