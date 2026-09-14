using System.Globalization;
using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.ApiService.Quotes.Pdf;

/**
 * Money, quantity and date formatting for the quote PDF, in one place.
 *
 * The culture is pinned to hu-HU rather than taken from the thread: the API
 * has no localization and its error messages are English literals, but this
 * document is a Hungarian paper handed to a customer, so its number and date
 * shapes must not depend on where the server happens to run.
 *
 * Rounding follows D19: unit prices and hourly rates carry two decimals, while
 * every line amount and total prints as whole forints.
 */
internal static class QuoteDocumentFormatting
{
    private static readonly CultureInfo Culture = CultureInfo.GetCultureInfo("hu-HU");

    /** Hungarian status labels; Expired is computed, never stored (D7). */
    private static readonly Dictionary<QuoteStatus, string> StatusLabels = new()
    {
        [QuoteStatus.Draft] = "Piszkozat",
        [QuoteStatus.Sent] = "Kiküldve",
        [QuoteStatus.Accepted] = "Elfogadva",
        [QuoteStatus.Rejected] = "Elutasítva",
    };

    /**
     * Formats a whole-forint amount: line amounts, VAT rows and totals.
     *
     * @param amount Amount to print.
     * @return Formatted amount with the HUF suffix.
     */
    internal static string FormatAmount(decimal amount) =>
        string.Create(Culture, $"{Math.Round(amount, 0, MidpointRounding.AwayFromZero):N0} Ft");

    /**
     * Formats a unit price or hourly rate with two decimals.
     *
     * @param amount Amount to print.
     * @return Formatted amount with the HUF suffix.
     */
    internal static string FormatUnitPrice(decimal amount) =>
        string.Create(Culture, $"{amount:N2} Ft");

    /**
     * Formats a line quantity, dropping the decimals when there are none, so a
     * whole piece count does not print as "2,00".
     *
     * @param quantity Quantity to print.
     * @param isLabor Whether the line is labor, which prints hours.
     * @return Formatted quantity with its unit.
     */
    internal static string FormatQuantity(decimal quantity, bool isLabor)
    {
        var unit = isLabor ? "óra" : "db";
        var value = quantity == Math.Truncate(quantity)
            ? string.Create(Culture, $"{quantity:N0}")
            : string.Create(Culture, $"{quantity:N2}");

        return $"{value} {unit}";
    }

    /**
     * Formats a date in the Hungarian long-numeric form.
     *
     * @param value Date to print.
     * @return Formatted date, for example "2026. 09. 14.".
     */
    internal static string FormatDate(DateTime value) => value.ToString("yyyy. MM. dd.", Culture);

    /**
     * Formats a VAT rate for a column header or a breakdown row.
     *
     * @param vatRatePercent VAT rate percentage.
     * @return Formatted percentage.
     */
    internal static string FormatVatRate(int vatRatePercent) => $"{vatRatePercent}%";

    /**
     * Resolves the printed status label, showing an expired sent quote as
     * expired so the paper cannot claim to be live when it is not (D29).
     *
     * @param status Stored quote status.
     * @param isExpired Whether the quote is a sent one past its deadline.
     * @return Hungarian status label.
     */
    internal static string ResolveStatusLabel(QuoteStatus status, bool isExpired) =>
        isExpired ? "Lejárt" : StatusLabels[status];
}
