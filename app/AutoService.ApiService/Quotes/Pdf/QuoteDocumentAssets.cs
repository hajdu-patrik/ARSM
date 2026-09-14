using System.Reflection;
using QuestPDF.Drawing;

namespace AutoService.ApiService.Quotes.Pdf;

/**
 * The fonts and the logo the quote PDF draws with, loaded from the assembly
 * rather than from disk.
 *
 * Both are embedded resources on purpose. A slim Linux container usually ships
 * no fonts and no fontconfig, and QuestPDF would then either substitute a face
 * without the Hungarian letters or throw; the docs folder that holds the logo
 * is not part of a published image either. Embedding removes both failure
 * modes at build time.
 */
internal static class QuoteDocumentAssets
{
    /** Font family every text style in the document names. */
    internal const string FontFamily = "Noto Sans";

    private const string RegularFontResource = "AutoService.ApiService.Assets.Fonts.NotoSans-Regular.ttf";
    private const string BoldFontResource = "AutoService.ApiService.Assets.Fonts.NotoSans-Bold.ttf";
    private const string LogoResource = "AutoService.ApiService.Assets.AppLogoFrameBlack.png";

    private static readonly Lazy<byte[]> LazyLogo = new(LoadLogo, LazyThreadSafetyMode.ExecutionAndPublication);

    /** The black logo variant, because the document always prints on white. */
    internal static byte[] Logo => LazyLogo.Value;

    /**
     * Registers the embedded font faces with QuestPDF. Called once from the
     * composition root, next to the license registration.
     */
    internal static void RegisterFonts()
    {
        FontManager.RegisterFontFromEmbeddedResource(RegularFontResource);
        FontManager.RegisterFontFromEmbeddedResource(BoldFontResource);
    }

    /**
     * Reads the embedded logo bytes.
     *
     * @return The logo image content.
     */
    private static byte[] LoadLogo()
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(LogoResource)
            ?? throw new InvalidOperationException($"Embedded logo resource '{LogoResource}' was not found in the assembly.");

        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    }
}
