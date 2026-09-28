using System.Globalization;
using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.ApiService.Quotes.Pdf;

/** Money/quantity/date formatting for the quote PDF; hu-HU is pinned regardless of server locale
 * (the API itself has no localization). Unit prices keep 2 decimals, totals print as whole forints (CLAUDE.md Quote Anchors). */
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

    /** Formats a whole-forint amount: line amounts, VAT rows and totals. */
    internal static string FormatAmount(decimal amount) =>
        string.Create(Culture, $"{Math.Round(amount, 0, MidpointRounding.AwayFromZero):N0} Ft");

    /** Formats a unit price or hourly rate with two decimals. */
    internal static string FormatUnitPrice(decimal amount) =>
        string.Create(Culture, $"{amount:N2} Ft");

    /** Formats a line quantity, dropping decimals when there are none, so a whole piece count doesn't print as "2,00". */
    internal static string FormatQuantity(decimal quantity, bool isLabor)
    {
        var unit = isLabor ? "óra" : "db";
        var value = quantity == Math.Truncate(quantity)
            ? string.Create(Culture, $"{quantity:N0}")
            : string.Create(Culture, $"{quantity:N2}");

        return $"{value} {unit}";
    }

    /** Formats a date in the Hungarian long-numeric form (e.g. "2026. 09. 14."). */
    internal static string FormatDate(DateTime value) => value.ToString("yyyy. MM. dd.", Culture);

    /** Formats a VAT rate for a column header or a breakdown row. */
    internal static string FormatVatRate(int vatRatePercent) => $"{vatRatePercent}%";

    /** Resolves the printed status label; an expired sent quote shows as expired so the paper cannot claim to be live (D29). */
    internal static string ResolveStatusLabel(QuoteStatus status, bool isExpired) =>
        isExpired ? "Lejárt" : StatusLabels[status];
}
