using AutoService.ApiService.Quotes.Pdf;

namespace AutoService.ApiService.Email.Templates;

/** Everything the quote mail prints about the quote and its recipient. */
internal sealed record QuoteSentEmailModel(
    string To,
    string CustomerName,
    string QuoteNumber,
    string Title,
    string VehicleLabel,
    decimal TotalGross,
    DateTime ValidUntil);

/** Builds the quote mail with the PDF attached after the inline logo. */
internal static class QuoteSentEmail
{
    internal static EmailMessage Build(QuoteSentEmailModel model, EmailFooter footer, byte[] pdf, string pdfFileName)
    {
        var total = QuoteDocumentFormatting.FormatAmount(model.TotalGross);
        var validUntil = QuoteDocumentFormatting.FormatDate(model.ValidUntil);
        var contact = $"{footer.CompanyName}, {footer.Phone}, {footer.ReplyTo}";

        var hungarian = new EmailBody()
            .Paragraph($"Tisztelt {model.CustomerName}!")
            .Paragraph("Köszönjük bizalmát, az árajánlatát az alábbiak szerint küldjük.")
            .Detail("Árajánlat száma", model.QuoteNumber)
            .Detail("Tárgy", model.Title)
            .Detail("Jármű", model.VehicleLabel)
            .Detail("Bruttó végösszeg", total)
            .Detail("Érvényes", validUntil)
            .Paragraph("Az árajánlatot PDF formátumban csatoltuk ehhez a levélhez.")
            .Paragraph($"Kérdés esetén keressen minket: {contact}");

        var english = new EmailBody()
            .Paragraph($"Dear {model.CustomerName},")
            .Paragraph($"Your quote {model.QuoteNumber} ({model.Title}) for {model.VehicleLabel} is attached as a PDF.")
            .Paragraph($"Gross total: {total}. Valid until: {validUntil}.")
            .Paragraph($"Questions? Contact us: {contact}");

        var (html, text) = EmailLayout.Render(new EmailLayoutContent(
            $"Árajánlat {model.QuoteNumber}", hungarian.Html, english.Html, hungarian.Text, english.Text, footer));

        return new EmailMessage(
            model.To,
            $"Árajánlat {model.QuoteNumber} - {footer.CompanyName} | Quote {model.QuoteNumber}",
            html,
            text,
            [EmailLayout.LogoAttachment(), new EmailAttachment(pdfFileName, pdf, "application/pdf", null)]);
    }
}
