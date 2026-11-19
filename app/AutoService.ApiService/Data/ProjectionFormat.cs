using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.ApiService.Data;

/** Formatting helpers for server-side DTO projections; EF Core evaluates them client-side. */
internal static class ProjectionFormat
{
    /** Formats owned name parts exactly like FullName.ToString(). */
    internal static string FullName(string firstName, string? middleName, string lastName)
        => new FullName(firstName, middleName, lastName).ToString();

    /** Returns the enum member name exactly like Enum.ToString(). */
    internal static string EnumName<TEnum>(TEnum value)
        where TEnum : struct, Enum
        => value.ToString();

    /** True when a profile picture object is stored for the person. */
    internal static bool HasProfilePicture(string? profilePictureObjectKey)
        => profilePictureObjectKey != null;
}
