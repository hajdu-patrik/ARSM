using System.Text.RegularExpressions;
using AutoService.ApiService.Email.Templates;

namespace AutoService.UnitTests.Email;

/** The shared frame escapes dynamic values, puts Hungarian first and stays mail-client safe. */
public sealed partial class EmailLayoutTests
{
    private const string Script = "<script>alert(1)</script> & co";

    private static readonly EmailFooter Footer =
        new("ARSM Kft.", "1111 Budapest, Fo utca 1.", "+36 1 111 1111", "info@arsm.hu");

    private static EmailLayoutContent Content(string title = "Title", EmailFooter? footer = null) =>
        new(title, "<p>HUBLOCK</p>", "<p>ENBLOCK</p>", "HUBLOCK", "ENBLOCK", footer ?? Footer);

    [GeneratedRegex("<img[^>]*src=\"https?://", RegexOptions.IgnoreCase)]
    private static partial Regex RemoteImage();

    [Fact]
    public void Render_escapes_markup_and_ampersands_in_the_title()
    {
        var (html, _) = EmailLayout.Render(Content(Script));

        Assert.DoesNotContain("<script>", html);
        Assert.Contains("&lt;script&gt;alert(1)&lt;/script&gt; &amp; co", html);
    }

    [Fact]
    public void Render_escapes_markup_and_ampersands_in_the_footer()
    {
        var footer = new EmailFooter(Script, Script, Script, Script);

        var (html, _) = EmailLayout.Render(Content(footer: footer));

        Assert.DoesNotContain("<script>", html);
        Assert.Equal(4, Regex.Matches(html, Regex.Escape("&lt;script&gt;alert(1)&lt;/script&gt; &amp; co")).Count);
    }

    [Fact]
    public void Escape_encodes_markup_and_ampersands()
    {
        Assert.Equal("&lt;b&gt;a&lt;/b&gt; &amp; &quot;c&quot;", EmailLayout.Escape("<b>a</b> & \"c\""));
    }

    [Fact]
    public void Render_puts_the_hungarian_block_before_the_english_one_in_html_and_text()
    {
        var (html, text) = EmailLayout.Render(Content());

        Assert.True(html.IndexOf("HUBLOCK", StringComparison.Ordinal) < html.IndexOf("ENBLOCK", StringComparison.Ordinal));
        Assert.True(text.IndexOf("HUBLOCK", StringComparison.Ordinal) < text.IndexOf("ENBLOCK", StringComparison.Ordinal));
    }

    [Fact]
    public void Render_prints_the_footer_in_html_and_text()
    {
        var (html, text) = EmailLayout.Render(Content());

        foreach (var part in new[] { "ARSM Kft.", "1111 Budapest, Fo utca 1.", "+36 1 111 1111", "info@arsm.hu" })
        {
            Assert.Contains(part, html);
            Assert.Contains(part, text);
        }
    }

    [Fact]
    public void Render_references_the_inline_logo_by_content_id()
    {
        var (html, _) = EmailLayout.Render(Content());

        Assert.Contains("cid:arsm-logo", html);
        Assert.StartsWith("<!DOCTYPE html>", html);
    }

    [Fact]
    public void Render_uses_inline_styles_and_no_remote_images()
    {
        var (html, text) = EmailLayout.Render(Content());

        Assert.DoesNotContain("<style", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<link", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotMatch(RemoteImage(), html);
        Assert.DoesNotContain("<", text);
    }

    [Fact]
    public void LogoAttachment_is_an_inline_png_with_the_logo_content_id()
    {
        var logo = EmailLayout.LogoAttachment();

        Assert.Equal("arsm-logo", EmailLayout.LogoContentId);
        Assert.Equal("arsm-logo", logo.ContentId);
        Assert.Equal("image/png", logo.ContentType);
        Assert.Equal("arsm-logo.png", logo.FileName);
        Assert.NotEmpty(logo.Content);
    }

    [Fact]
    public void Footer_From_builds_the_address_line_from_the_company_profile()
    {
        var company = new AutoService.ApiService.Configuration.CompanyProfile(
            "ARSM Kft.", "Fo utca 1.", "1111", "Budapest", "11111111-1-11", "+36 1 111 1111", "info@arsm.hu");

        var footer = EmailFooter.From(company, "reply@arsm.hu");

        Assert.Equal(new EmailFooter("ARSM Kft.", "1111 Budapest, Fo utca 1.", "+36 1 111 1111", "reply@arsm.hu"), footer);
    }
}
