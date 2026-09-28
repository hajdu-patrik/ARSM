namespace AutoService.ApiService.Pricing;

/** Display-only gross amount from net + VAT rate; never feeds line/total math (see CLAUDE.md Catalog Anchors). */
internal static class PricingCalculator
{
    /** Calculates the display-only gross unit price (or gross hourly rate) for a net amount. */
    internal static decimal GrossUnitPrice(decimal netUnitPrice, int vatRatePercent)
        => MoneyRounding.RoundMoney(netUnitPrice * (1 + vatRatePercent / 100m));
}
