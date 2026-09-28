namespace AutoService.ApiService.Pricing;

/** Net, VAT, and gross amount for a single quote line. */
internal readonly record struct QuoteLineAmounts(decimal NetAmount, decimal VatAmount, decimal GrossAmount);

/** Computes line-level net/VAT/gross amounts; the single owner of quote-line pricing math (consumed by QuoteEndpoints.Helpers.cs and the demo seed). */
internal static class QuoteLineCalculator
{
    /** Calculates net/VAT/gross for one quote line; gross = net + vat, never a multiplication (root CLAUDE.md Core Invariants). */
    internal static QuoteLineAmounts Calculate(decimal quantity, decimal netUnitPrice, int vatRatePercent)
    {
        var netAmount = MoneyRounding.RoundMoney(quantity * netUnitPrice);
        var vatAmount = MoneyRounding.RoundMoney(netAmount * vatRatePercent / 100);
        var grossAmount = netAmount + vatAmount;

        return new QuoteLineAmounts(netAmount, vatAmount, grossAmount);
    }
}
