namespace AutoService.ApiService.Pricing;

/**
 * Net, VAT, and gross totals for a quote.
 */
internal readonly record struct QuoteTotals(decimal TotalNet, decimal TotalVat, decimal TotalGross);

/**
 * Sums quote line amounts into quote-level totals.
 *
 * Not yet consumed in F1 — quotes are introduced in phase F3. Kept here
 * intentionally alongside QuoteLineCalculator.
 */
internal static class QuoteTotalsCalculator
{
    /**
     * Calculates quote-level totals from line amounts.
     * TotalGross comes from TotalNet + TotalVat, never re-rounded and never
     * from multiplication, mirroring the per-line rule.
     *
     * @param lines Line-level net/VAT/gross amounts.
     * @return The summed quote totals.
     */
    internal static QuoteTotals Calculate(IEnumerable<QuoteLineAmounts> lines)
    {
        var totalNet = 0m;
        var totalVat = 0m;

        foreach (var line in lines)
        {
            totalNet += line.NetAmount;
            totalVat += line.VatAmount;
        }

        var totalGross = totalNet + totalVat;

        return new QuoteTotals(totalNet, totalVat, totalGross);
    }
}
