using System.Net;
using System.Text;
using AutoService.ApiService.Quotes.Pdf;

namespace AutoService.ApiService.Email.Templates;

/** Shared branded frame: table-based, inline styles only, Hungarian block first, then the English one. */
internal static class EmailLayout
{
    internal const string LogoContentId = "arsm-logo";

    internal static EmailAttachment LogoAttachment() =>
        new("arsm-logo.png", QuoteDocumentAssets.Logo, "image/png", LogoContentId);

    internal static string Escape(string value) => WebUtility.HtmlEncode(value);

    internal static (string Html, string Text) Render(EmailLayoutContent content) =>
        (RenderHtml(content), RenderText(content));

    private static string RenderHtml(EmailLayoutContent content)
    {
        var footer = content.Footer;
        var cell = $"font-family:{EmailPalette.FontStack};color:{EmailPalette.Text};";

        return $"""
            <!DOCTYPE html>
            <html lang="hu">
            <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>{Escape(content.Title)}</title>
            </head>
            <body style="margin:0;padding:0;background-color:{EmailPalette.Surface};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{EmailPalette.Surface};">
            <tr><td align="center" style="padding:24px 12px;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:{EmailPalette.Card};border:1px solid {EmailPalette.Border};">
            <tr><td style="padding:24px 32px 16px 32px;border-bottom:3px solid {EmailPalette.Accent};"><img src="cid:{LogoContentId}" alt="ARSM" width="120" style="display:block;border:0;height:auto;"></td></tr>
            <tr><td lang="hu" style="padding:24px 32px 8px 32px;{cell}font-size:15px;line-height:1.5;">
            <h1 style="margin:0 0 16px 0;font-size:20px;line-height:1.3;">{Escape(content.Title)}</h1>
            {content.HungarianHtml}
            </td></tr>
            <tr><td style="padding:8px 32px;"><div style="border-top:1px solid {EmailPalette.Border};font-size:0;line-height:0;">&nbsp;</div></td></tr>
            <tr><td lang="en" style="padding:8px 32px 24px 32px;font-family:{EmailPalette.FontStack};color:{EmailPalette.Muted};font-size:13px;line-height:1.5;">
            {content.EnglishHtml}
            </td></tr>
            <tr><td style="padding:16px 32px 24px 32px;border-top:1px solid {EmailPalette.Border};font-family:{EmailPalette.FontStack};color:{EmailPalette.Muted};font-size:12px;line-height:1.5;">
            <strong>{Escape(footer.CompanyName)}</strong><br>
            {Escape(footer.AddressLine)}<br>
            {Escape(footer.Phone)}<br>
            {Escape(footer.ReplyTo)}
            </td></tr>
            </table>
            </td></tr>
            </table>
            </body>
            </html>
            """;
    }

    private static string RenderText(EmailLayoutContent content)
    {
        var footer = content.Footer;
        var text = new StringBuilder();
        text.Append(content.Title).Append("\n\n");
        text.Append(content.HungarianText).Append("\n\n---\n\n");
        text.Append(content.EnglishText).Append("\n\n");
        text.Append(footer.CompanyName).Append("\n");
        text.Append(footer.AddressLine).Append("\n");
        text.Append(footer.Phone).Append("\n");
        text.Append(footer.ReplyTo);
        return text.ToString();
    }
}
