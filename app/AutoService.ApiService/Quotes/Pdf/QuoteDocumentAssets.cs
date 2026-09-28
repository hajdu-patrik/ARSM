using System.Reflection;
using QuestPDF.Drawing;

namespace AutoService.ApiService.Quotes.Pdf;

/** Fonts and logo the quote PDF draws with, loaded from the assembly (embedded resources), not disk:
 * a slim container ships no fonts/fontconfig and the logo folder isn't in a published image either. */
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

    /** Registers the embedded font faces with QuestPDF; called once from the composition root, next to the license registration. */
    internal static void RegisterFonts()
    {
        FontManager.RegisterFontFromEmbeddedResource(RegularFontResource);
        FontManager.RegisterFontFromEmbeddedResource(BoldFontResource);
    }

    /** Reads the embedded logo bytes. */
    private static byte[] LoadLogo()
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(LogoResource)
            ?? throw new InvalidOperationException($"Embedded logo resource '{LogoResource}' was not found in the assembly.");

        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    }
}
