using AutoService.ApiService.Configuration;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace AutoService.ApiService.Quotes.Pdf;

/**
 * Section composition for the quote PDF: the repeating header, the identity
 * blocks, the notes and the footer. The line tables, the VAT breakdown and the
 * totals live in the Lines partial, because a document this size outgrows one
 * file long before it is finished.
 *
 * Every user-visible string here is Hungarian: the document is the paper the
 * customer receives, and the API has no localization layer to route it
 * through.
 */
internal static partial class QuoteDocumentSections
{
    private static readonly Color SectionTitleColor = Colors.Grey.Darken3;
    private static readonly Color MutedColor = Colors.Grey.Darken1;
    private static readonly Color BorderColor = Colors.Grey.Lighten2;

    /**
     * Draws the letterhead: logo and company identity on the left, the
     * document name and the quote number on the right. It repeats on every
     * page, so a multi-page quote never loses its number.
     *
     * @param container Header container.
     * @param company Configured workshop identity (D18).
     * @param model The quote being printed.
     */
    internal static void ComposeHeader(IContainer container, CompanyProfile company, QuoteDocumentModel model)
    {
        container.PaddingBottom(10).Column(column =>
        {
            column.Item().Row(row =>
            {
                row.ConstantItem(56).AlignMiddle().Image(QuoteDocumentAssets.Logo);

                row.RelativeItem().PaddingLeft(12).Column(details =>
                {
                    details.Item().Text(company.Name).FontSize(13).Bold();
                    details.Item().Text($"{company.PostalCode} {company.City}, {company.AddressLine}").FontSize(8).FontColor(MutedColor);
                    details.Item().Text($"Adószám: {company.TaxNumber}").FontSize(8).FontColor(MutedColor);
                    details.Item().Text($"Telefon: {company.PhoneNumber} · E-mail: {company.Email}").FontSize(8).FontColor(MutedColor);
                });

                row.ConstantItem(150).AlignRight().Column(identity =>
                {
                    identity.Item().AlignRight().Text("Árajánlat").FontSize(16).Bold();
                    identity.Item().AlignRight().Text(model.QuoteNumber).FontSize(11);
                });
            });

            column.Item().PaddingTop(8).LineHorizontal(1).LineColor(BorderColor);
        });
    }

    /**
     * Draws the page footer: the workshop name and the page counter, so a
     * customer can tell that a page is missing.
     *
     * @param container Footer container.
     * @param company Configured workshop identity.
     */
    internal static void ComposeFooter(IContainer container, CompanyProfile company)
    {
        container.PaddingTop(8).Row(row =>
        {
            row.RelativeItem().Text(company.Name).FontSize(8).FontColor(MutedColor);
            row.RelativeItem().AlignRight().Text(text =>
            {
                text.DefaultTextStyle(style => style.FontSize(8).FontColor(MutedColor));
                text.CurrentPageNumber();
                text.Span(" / ");
                text.TotalPages();
                text.Span(" oldal");
            });
        });
    }

    /**
     * Composes the document body in printing order.
     *
     * @param container Content container.
     * @param model The quote being printed.
     */
    internal static void ComposeContent(IContainer container, QuoteDocumentModel model)
    {
        container.Column(column =>
        {
            column.Spacing(12);

            column.Item().Element(basics => ComposeBasics(basics, model));
            column.Item().Element(parties => ComposeParties(parties, model));

            if (model.PartLines.Count > 0)
            {
                column.Item().Element(parts => ComposePartLines(parts, model.PartLines));
            }

            if (model.LaborLines.Count > 0)
            {
                column.Item().Element(labor => ComposeLaborLines(labor, model.LaborLines));
            }

            column.Item().Element(vat => ComposeVatBreakdown(vat, model.VatBreakdown));
            column.Item().Element(totals => ComposeTotals(totals, model));

            if (!string.IsNullOrWhiteSpace(model.Notes))
            {
                column.Item().Element(notes => ComposeNotes(notes, model.Notes));
            }

            column.Item().Element(author => ComposeAuthor(author, model.CreatedByMechanicName));
        });
    }

    /**
     * Draws the quote's own data, the status included: a draft says so on
     * paper, and an expired quote admits it (D29).
     *
     * @param container Section container.
     * @param model The quote being printed.
     */
    private static void ComposeBasics(IContainer container, QuoteDocumentModel model)
    {
        container.Column(column =>
        {
            column.Item().Text(model.Title).FontSize(12).Bold();
            column.Item().PaddingTop(4).Row(row =>
            {
                row.RelativeItem().Element(item => ComposeLabeledValue(item, "Kelte", QuoteDocumentFormatting.FormatDate(model.CreatedAt)));
                row.RelativeItem().Element(item => ComposeLabeledValue(item, "Érvényes eddig", QuoteDocumentFormatting.FormatDate(model.ValidUntil)));
                row.RelativeItem().Element(item => ComposeLabeledValue(item, "Állapot", model.StatusLabel));
            });
        });
    }

    /**
     * Draws the customer and the vehicle side by side.
     *
     * @param container Section container.
     * @param model The quote being printed.
     */
    private static void ComposeParties(IContainer container, QuoteDocumentModel model)
    {
        container.Row(row =>
        {
            row.RelativeItem().Element(customer => ComposeCustomer(customer, model.Customer));
            row.ConstantItem(16);
            row.RelativeItem().Element(vehicle => ComposeVehicle(vehicle, model.Vehicle));
        });
    }

    private static void ComposeCustomer(IContainer container, QuoteDocumentCustomer customer)
    {
        container.Column(column =>
        {
            column.Item().Element(title => ComposeSectionTitle(title, "Ügyfél"));
            column.Item().Text(customer.Name);

            if (!string.IsNullOrWhiteSpace(customer.PhoneNumber))
            {
                column.Item().Text(customer.PhoneNumber).FontSize(8).FontColor(MutedColor);
            }

            if (!string.IsNullOrWhiteSpace(customer.Email))
            {
                column.Item().Text(customer.Email).FontSize(8).FontColor(MutedColor);
            }
        });
    }

    private static void ComposeVehicle(IContainer container, QuoteDocumentVehicle vehicle)
    {
        container.Column(column =>
        {
            column.Item().Element(title => ComposeSectionTitle(title, "Jármű"));
            column.Item().Text($"{vehicle.LicensePlate} · {vehicle.Brand} {vehicle.Model} ({vehicle.Year})");
            column.Item().Text($"Alvázszám: {vehicle.Vin}").FontSize(8).FontColor(MutedColor);
        });
    }

    private static void ComposeNotes(IContainer container, string? notes)
    {
        container.Column(column =>
        {
            column.Item().Element(title => ComposeSectionTitle(title, "Megjegyzés"));
            column.Item().Text(notes);
        });
    }

    private static void ComposeAuthor(IContainer container, string? mechanicName)
    {
        var value = string.IsNullOrWhiteSpace(mechanicName) ? "-" : mechanicName;
        container.Text($"Készítette: {value}").FontSize(8).FontColor(MutedColor);
    }

    /** Section heading shared by every block. */
    private static void ComposeSectionTitle(IContainer container, string title)
    {
        container.PaddingBottom(4).Text(title).FontSize(10).Bold().FontColor(SectionTitleColor);
    }

    /** Small label above a value, used by the basics row. */
    private static void ComposeLabeledValue(IContainer container, string label, string value)
    {
        container.Column(column =>
        {
            column.Item().Text(label).FontSize(8).FontColor(MutedColor);
            column.Item().Text(value);
        });
    }
}
