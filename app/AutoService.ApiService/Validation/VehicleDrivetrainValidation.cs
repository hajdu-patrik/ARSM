using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.ApiService.Validation;

/** Validates vehicle drivetrain enum values from DTO string boundaries. */
internal static class VehicleDrivetrainValidation
{
    /** Parses a drivetrain string to the canonical enum value without accepting numeric enum input. */
    internal static bool TryParse(
        string? rawValue,
        out DrivetrainType drivetrainType,
        out string validationError,
        string fieldName = "DrivetrainType")
    {
        drivetrainType = default;
        validationError = string.Empty;

        if (string.IsNullOrWhiteSpace(rawValue))
        {
            validationError = $"{fieldName} is required.";
            return false;
        }

        var trimmed = rawValue.Trim();
        var matchedName = Enum.GetNames<DrivetrainType>()
            .FirstOrDefault(name => string.Equals(name, trimmed, StringComparison.OrdinalIgnoreCase));

        if (matchedName is null)
        {
            validationError = $"{fieldName} must be one of: {string.Join(", ", Enum.GetNames<DrivetrainType>())}.";
            return false;
        }

        drivetrainType = Enum.Parse<DrivetrainType>(matchedName);
        return true;
    }
}
