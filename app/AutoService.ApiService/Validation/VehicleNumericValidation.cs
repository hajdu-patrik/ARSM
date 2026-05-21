namespace AutoService.ApiService.Validation;

internal static class VehicleNumericValidation
{
    internal const int MinYear = 1886;
    internal const int MaxYear = 2100;
    internal const int MaxMileageKm = 1_000_000;
    internal const int MaxEnginePowerKw = 50_000;

    internal static string? GetYearValidationError(int year)
    {
        if (year < MinYear || year > MaxYear)
        {
            return $"Year must be between {MinYear} and {MaxYear}.";
        }

        return null;
    }

    internal static string? GetValidationError(
        int mileageKm,
        int enginePowerKw,
        string fieldPrefix = "")
    {
        var prefix = string.IsNullOrEmpty(fieldPrefix) ? string.Empty : fieldPrefix;

        if (mileageKm < 0 || enginePowerKw < 0)
        {
            return $"{prefix}MileageKm and {prefix}EnginePowerKw must be non-negative.";
        }

        if (mileageKm > MaxMileageKm || enginePowerKw > MaxEnginePowerKw)
        {
            return $"{prefix}MileageKm must be <= {MaxMileageKm} and {prefix}EnginePowerKw must be <= {MaxEnginePowerKw}.";
        }

        return null;
    }
}
