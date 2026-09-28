using AutoService.ApiService.Configuration;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace AutoService.ApiService.Quotes.Pdf;

/** Printable quote: A4 portrait, 2cm margins, repeating letterhead, page-counting footer. Every
 * style names the embedded font (Noto Sans) so a slim container never falls back to a face missing Hungarian accents. */
internal sealed class QuoteDocument : IDocument
{
    private readonly QuoteDocumentModel model;
    private readonly CompanyProfile company;

    /** Creates the document for one quote. */
    internal QuoteDocument(QuoteDocumentModel model, CompanyProfile company)
    {
        this.model = model;
        this.company = company;
    }

    /** Builds the page layout. */
    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(2, Unit.Centimetre);
            page.DefaultTextStyle(style => style
                .FontFamily(QuoteDocumentAssets.FontFamily)
                .FontSize(9)
                .FontColor(Colors.Black));

            page.Header().Element(header => QuoteDocumentSections.ComposeHeader(header, company, model));
            page.Content().Element(content => QuoteDocumentSections.ComposeContent(content, model));
            page.Footer().Element(footer => QuoteDocumentSections.ComposeFooter(footer, company));
        });
    }
}
