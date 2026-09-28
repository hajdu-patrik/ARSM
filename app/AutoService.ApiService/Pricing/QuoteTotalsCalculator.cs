namespace AutoService.ApiService.Pricing;

/** Net, VAT, and gross totals for a quote. */
internal readonly record struct QuoteTotals(decimal TotalNet, decimal TotalVat, decimal TotalGross);

/** Sums quote line amounts into quote-level totals (consumed by QuoteEndpoints.Helpers.cs and the demo seed, alongside QuoteLineCalculator). */
internal static class QuoteTotalsCalculator
{
    /** Calculates quote-level totals from line amounts; TotalGross = TotalNet + TotalVat, never re-rounded (root CLAUDE.md Core Invariants). */
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
