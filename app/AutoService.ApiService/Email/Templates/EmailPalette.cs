namespace AutoService.ApiService.Email.Templates;

/** Light-theme hex values copied from app/AutoService.WebUI/src/styles/tokens.css, so mails match the WebUI. */
internal static class EmailPalette
{
    // --color-arsm-primary: primary text
    internal const string Text = "#2d2440";

    // --color-arsm-muted: secondary text, the English block and the footer
    internal const string Muted = "#6a6185";

    // --color-arsm-border: dividers and card border
    internal const string Border = "#d9d1ec";

    // --color-arsm-surface: page background behind the card
    internal const string Surface = "#f2f0f8";

    // --color-arsm-card: card background and the password cell
    internal const string Card = "#f8f5ff";

    // --color-arsm-accent: rule under the logo
    internal const string Accent = "#cdb8ff";

    // --color-arsm-accent-deep: link colour
    internal const string Link = "#5f4698";

    internal const string FontStack = "Arial, Helvetica, sans-serif";

    internal const string MonoStack = "Courier New, Courier, monospace";
}
