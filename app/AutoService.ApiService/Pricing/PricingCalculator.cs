namespace AutoService.ApiService.Pricing;

/**
 * Computes display-only gross amounts from a net amount and a VAT rate.
 * Never feeds line or total arithmetic — those always derive gross from
 * addition (see QuoteLineCalculator, QuoteTotalsCalculator).
 */
internal static class PricingCalculator
{
    /**
     * Calculates the display-only gross unit price (or gross hourly rate)
     * for a net amount.
     *
     * @param netUnitPrice Net unit price or net hourly rate.
     * @param vatRatePercent VAT rate percentage.
     * @return Gross amount, rounded to 2 decimals.
     */
    internal static decimal GrossUnitPrice(decimal netUnitPrice, int vatRatePercent)
        => MoneyRounding.RoundMoney(netUnitPrice * (1 + vatRatePercent / 100m));
}
