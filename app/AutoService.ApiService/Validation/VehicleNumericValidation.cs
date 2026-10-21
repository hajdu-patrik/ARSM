namespace AutoService.ApiService.Validation;

internal static class VehicleNumericValidation
{
    internal const int MinYear = 1886;
    internal const int MaxYear = 2100;
    internal const int MaxMileageKm = 1_000_000;
    internal const int MaxEnginePowerKw = 50_000;

    internal static string? GetYearValidationError(int year, string fieldPrefix = "")
    {
        if (year < MinYear || year > MaxYear)
        {
            return $"{fieldPrefix}Year must be between {MinYear} and {MaxYear}.";
        }

        return null;
    }

    internal static string? GetValidationError(
        int mileageKm,
        int enginePowerKw,
        string fieldPrefix = "")
    {
        if (mileageKm < 0 || enginePowerKw < 0)
        {
            return $"{fieldPrefix}MileageKm and {fieldPrefix}EnginePowerKw must be non-negative.";
        }

        if (mileageKm > MaxMileageKm || enginePowerKw > MaxEnginePowerKw)
        {
            return $"{fieldPrefix}MileageKm must be <= {MaxMileageKm} and {fieldPrefix}EnginePowerKw must be <= {MaxEnginePowerKw}.";
        }

        return null;
    }
}
