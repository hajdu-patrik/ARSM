namespace AutoService.ApiService.Validation;

internal static class PricingValidation
{
    internal const decimal MinMoneyAmount = 0m;
    internal const decimal MaxMoneyAmount = 100_000_000m;
    internal const decimal MaxQuantity = 10_000m;

    private static readonly int[] AllowedVatRatePercentages = [0, 5, 18, 27];

    internal static string? GetVatRateValidationError(int vatRatePercent)
    {
        if (!AllowedVatRatePercentages.Contains(vatRatePercent))
        {
            return ValidationMessages.InvalidVatRate;
        }

        return null;
    }

    internal static string? GetMoneyAmountValidationError(decimal amount)
    {
        if (amount < MinMoneyAmount || amount > MaxMoneyAmount)
        {
            return ValidationMessages.InvalidMoneyAmount;
        }

        return null;
    }

    internal static string? GetQuantityValidationError(decimal quantity)
    {
        if (quantity <= 0 || quantity > MaxQuantity)
        {
            return ValidationMessages.InvalidQuantity;
        }

        return null;
    }
}
