namespace AutoService.ApiService.Validation;

internal static class VehicleNumericValidation
{
    internal const int MinYear = 1886;
    internal const int MaxYear = 2100;
    internal const int MaxMileageKm = 1_000_000;
    internal const int MaxEnginePowerHp = 50_000;
    internal const int MaxEngineTorqueNm = 50_000;

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
        int enginePowerHp,
        int engineTorqueNm,
        string fieldPrefix = "")
    {
        var prefix = string.IsNullOrEmpty(fieldPrefix) ? string.Empty : fieldPrefix;

        if (mileageKm < 0 || enginePowerHp < 0 || engineTorqueNm < 0)
        {
            return $"{prefix}MileageKm, {prefix}EnginePowerHp, and {prefix}EngineTorqueNm must be non-negative.";
        }

        if (mileageKm > MaxMileageKm || enginePowerHp > MaxEnginePowerHp || engineTorqueNm > MaxEngineTorqueNm)
        {
            return $"{prefix}MileageKm must be <= {MaxMileageKm}, {prefix}EnginePowerHp must be <= {MaxEnginePowerHp}, and {prefix}EngineTorqueNm must be <= {MaxEngineTorqueNm}.";
        }

        return null;
    }
}
