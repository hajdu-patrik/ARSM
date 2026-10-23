using System.Text;

namespace AutoService.ApiService.Email.Templates;

/** Builds one language block as escaped HTML and its markup-free text twin in a single pass. */
internal sealed class EmailBody
{
    private readonly StringBuilder _html = new();
    private readonly StringBuilder _text = new();
    private bool _lastWasDetail;

    internal string Html => _html.ToString();

    internal string Text => _text.ToString();

    internal EmailBody Paragraph(string text)
    {
        _html.Append($"""<p style="margin:0 0 12px 0;">{EmailLayout.Escape(text)}</p>""");
        AppendText(text, detail: false);
        return this;
    }

    internal EmailBody Detail(string label, string value)
    {
        _html.Append($"""<p style="margin:0 0 4px 0;"><strong>{EmailLayout.Escape(label)}:</strong> {EmailLayout.Escape(value)}</p>""");
        AppendText($"{label}: {value}", detail: true);
        return this;
    }

    internal EmailBody Link(string label, string url)
    {
        var href = EmailLayout.Escape(url);
        _html.Append($"""<p style="margin:0 0 12px 0;">{EmailLayout.Escape(label)} <a href="{href}" style="color:{EmailPalette.Link};">{href}</a></p>""");
        AppendText($"{label} {url}", detail: false);
        return this;
    }

    internal EmailBody Code(string label, string value)
    {
        _html.Append($"""<p style="margin:0 0 6px 0;">{EmailLayout.Escape(label)}</p>""");
        _html.Append($"""<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;"><tr><td style="padding:10px 14px;background-color:{EmailPalette.Card};border:1px solid {EmailPalette.Border};font-family:{EmailPalette.MonoStack};font-size:16px;color:{EmailPalette.Text};">{EmailLayout.Escape(value)}</td></tr></table>""");
        AppendText($"{label} {value}", detail: false);
        return this;
    }

    private void AppendText(string line, bool detail)
    {
        if (_text.Length > 0)
        {
            _text.Append(detail && _lastWasDetail ? "\n" : "\n\n");
        }

        _text.Append(line);
        _lastWasDetail = detail;
    }
}
