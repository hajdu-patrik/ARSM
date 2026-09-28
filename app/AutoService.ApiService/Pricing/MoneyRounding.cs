namespace AutoService.ApiService.Pricing;

/** Canonical money rounding rule shared by every pricing calculation. */
internal static class MoneyRounding
{
    /** Rounds a monetary amount to 2 decimals, away from zero. */
    internal static decimal RoundMoney(decimal value)
        => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
