namespace AutoService.ApiService.Pricing;

/**
 * Net, VAT, and gross amount for a single quote line.
 */
internal readonly record struct QuoteLineAmounts(decimal NetAmount, decimal VatAmount, decimal GrossAmount);

/**
 * Computes line-level net, VAT, and gross amounts for a single quote line.
 *
 * Not yet consumed in F1 — quote lines are introduced in phase F3. Kept here
 * intentionally so the pricing math has a single owner from the start.
 */
internal static class QuoteLineCalculator
{
    /**
     * Calculates the net, VAT, and gross amount for one quote line.
     * Gross always comes from netAmount + vatAmount, never from multiplying
     * quantity by a gross unit price, so it never drifts from the sum of its parts.
     *
     * @param quantity Line quantity.
     * @param netUnitPrice Net unit price.
     * @param vatRatePercent VAT rate percentage applied to the line.
     * @return The computed line amounts.
     */
    internal static QuoteLineAmounts Calculate(decimal quantity, decimal netUnitPrice, int vatRatePercent)
    {
        var netAmount = MoneyRounding.RoundMoney(quantity * netUnitPrice);
        var vatAmount = MoneyRounding.RoundMoney(netAmount * vatRatePercent / 100);
        var grossAmount = netAmount + vatAmount;

        return new QuoteLineAmounts(netAmount, vatAmount, grossAmount);
    }
}
