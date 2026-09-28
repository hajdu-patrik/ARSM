using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace AutoService.ApiService.Quotes.Pdf;

internal static partial class QuoteDocumentSections
{
    /** Draws the parts block: pieces at a net unit price, with the part number next to the description. */
    private static void ComposePartLines(IContainer container, IReadOnlyList<QuoteDocumentLine> lines)
    {
        ComposeLineSection(
            container,
            "Alkatrészek",
            identifierHeader: "Cikkszám",
            quantityHeader: "Mennyiség",
            unitPriceHeader: "Nettó egységár",
            lines,
            isLabor: false);
    }

    /** Draws the labor block; column headers deliberately differ from the parts block (hours at an
     * hourly rate, not a generic quantity at a unit price). */
    private static void ComposeLaborLines(IContainer container, IReadOnlyList<QuoteDocumentLine> lines)
    {
        ComposeLineSection(
            container,
            "Munkadíj",
            identifierHeader: "Kód",
            quantityHeader: "Óra",
            unitPriceHeader: "Óradíj",
            lines,
            isLabor: true);
    }

    /** Renders one line block with the column labels its kind needs. */
    private static void ComposeLineSection(
        IContainer container,
        string title,
        string identifierHeader,
        string quantityHeader,
        string unitPriceHeader,
        IReadOnlyList<QuoteDocumentLine> lines,
        bool isLabor)
    {
        container.Column(column =>
        {
            column.Item().Element(heading => ComposeSectionTitle(heading, title));

            column.Item().Table(table =>
            {
                // Widths follow the widest header per column: description gets the slack, price
                // columns need room for "Nettó egységár" plus a thousand-separated amount.
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(4.6f);
                    columns.RelativeColumn(2.1f);
                    columns.RelativeColumn(1.9f);
                    columns.RelativeColumn(2.4f);
                    columns.RelativeColumn(1f);
                    columns.RelativeColumn(2f);
                    columns.RelativeColumn(2f);
                });

                table.Header(header =>
                {
                    header.Cell().Element(HeaderCell).Text("Megnevezés");
                    header.Cell().Element(HeaderCell).Text(identifierHeader);
                    header.Cell().Element(HeaderCellRight).Text(quantityHeader);
                    header.Cell().Element(HeaderCellRight).Text(unitPriceHeader);
                    header.Cell().Element(HeaderCellRight).Text("ÁFA");
                    header.Cell().Element(HeaderCellRight).Text("Nettó");
                    header.Cell().Element(HeaderCellRight).Text("Bruttó");
                });

                foreach (var line in lines)
                {
                    table.Cell().Element(BodyCell).Text(line.Description);
                    table.Cell().Element(BodyCell).Text(line.Identifier ?? "-").FontColor(MutedColor);
                    table.Cell().Element(BodyCellRight).Text(QuoteDocumentFormatting.FormatQuantity(line.Quantity, isLabor));
                    table.Cell().Element(BodyCellRight).Text(QuoteDocumentFormatting.FormatUnitPrice(line.NetUnitPrice));
                    table.Cell().Element(BodyCellRight).Text(QuoteDocumentFormatting.FormatVatRate(line.VatRatePercent));
                    table.Cell().Element(BodyCellRight).Text(QuoteDocumentFormatting.FormatAmount(line.NetAmount));
                    table.Cell().Element(BodyCellRight).Text(QuoteDocumentFormatting.FormatAmount(line.GrossAmount));
                }
            });
        });
    }

    /** Draws the VAT breakdown: tax base and tax charged per rate, the figures an accountant checks first. */
    private static void ComposeVatBreakdown(IContainer container, IReadOnlyList<QuoteDocumentVatRow> rows)
    {
        container.Column(column =>
        {
            column.Item().Element(heading => ComposeSectionTitle(heading, "ÁFA-bontás"));

            column.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(2);
                    columns.RelativeColumn(3);
                    columns.RelativeColumn(3);
                });

                table.Header(header =>
                {
                    header.Cell().Element(HeaderCell).Text("Kulcs");
                    header.Cell().Element(HeaderCellRight).Text("Adóalap");
                    header.Cell().Element(HeaderCellRight).Text("Adó");
                });

                foreach (var row in rows)
                {
                    table.Cell().Element(BodyCell).Text(QuoteDocumentFormatting.FormatVatRate(row.VatRatePercent));
                    table.Cell().Element(BodyCellRight).Text(QuoteDocumentFormatting.FormatAmount(row.NetAmount));
                    table.Cell().Element(BodyCellRight).Text(QuoteDocumentFormatting.FormatAmount(row.VatAmount));
                }
            });
        });
    }

    /** Draws the totals block; the gross total carries the emphasis, since it's the number the customer decides on. */
    private static void ComposeTotals(IContainer container, QuoteDocumentModel model)
    {
        container.AlignRight().Width(240).Column(column =>
        {
            column.Item().Element(row => ComposeTotalRow(row, "Összesen nettó", QuoteDocumentFormatting.FormatAmount(model.TotalNet), isEmphasized: false));
            column.Item().Element(row => ComposeTotalRow(row, "Összesen ÁFA", QuoteDocumentFormatting.FormatAmount(model.TotalVat), isEmphasized: false));
            column.Item().PaddingTop(4).BorderTop(1).BorderColor(BorderColor).PaddingTop(4)
                .Element(row => ComposeTotalRow(row, "Összesen bruttó", QuoteDocumentFormatting.FormatAmount(model.TotalGross), isEmphasized: true));
        });
    }

    private static void ComposeTotalRow(IContainer container, string label, string value, bool isEmphasized)
    {
        container.Row(row =>
        {
            var labelCell = row.RelativeItem().Text(label);
            var valueCell = row.ConstantItem(110).AlignRight().Text(value);

            if (!isEmphasized)
            {
                return;
            }

            labelCell.FontSize(11).Bold();
            valueCell.FontSize(11).Bold();
        });
    }

    // Cells keep a right gutter so a long description and the next column never
    // touch; without it the parts table reads as one run-on line.
    private static IContainer HeaderCell(IContainer container) =>
        container.BorderBottom(1).BorderColor(BorderColor).PaddingVertical(4).PaddingRight(6)
            .DefaultTextStyle(style => style.SemiBold().FontSize(8).FontColor(MutedColor));

    private static IContainer HeaderCellRight(IContainer container) => HeaderCell(container).AlignRight();

    private static IContainer BodyCell(IContainer container) =>
        container.BorderBottom(1).BorderColor(BorderColor).PaddingVertical(4).PaddingRight(6);

    private static IContainer BodyCellRight(IContainer container) => BodyCell(container).AlignRight();
}
