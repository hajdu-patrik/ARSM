using AutoService.ApiService.Configuration;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace AutoService.ApiService.Quotes.Pdf;

/**
 * The printable quote: A4 portrait, 2 cm margins, a letterhead that repeats on
 * every page and a footer that counts the pages, so a customer can tell when a
 * sheet is missing.
 *
 * Every text style names the embedded font family. QuestPDF would otherwise
 * fall back to a system face, which in a slim container either does not exist
 * or lacks the Hungarian letters, and the accents would silently turn into
 * empty boxes.
 */
internal sealed class QuoteDocument : IDocument
{
    private readonly QuoteDocumentModel model;
    private readonly CompanyProfile company;

    /**
     * Creates the document for one quote.
     *
     * @param model Resolved render model of the quote.
     * @param company Configured workshop identity printed on the letterhead.
     */
    internal QuoteDocument(QuoteDocumentModel model, CompanyProfile company)
    {
        this.model = model;
        this.company = company;
    }

    /**
     * Builds the page layout.
     *
     * @param container Document container supplied by QuestPDF.
     */
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
