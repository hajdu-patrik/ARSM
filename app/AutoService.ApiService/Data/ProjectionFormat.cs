using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.ApiService.Data;

/** Formatting helpers the server-side DTO projections call; EF Core evaluates them client-side, so the output matches the entity formatting exactly. */
internal static class ProjectionFormat
{
    /** Formats owned name parts exactly like FullName.ToString(). */
    internal static string FullName(string firstName, string? middleName, string lastName)
        => new FullName(firstName, middleName, lastName).ToString();

    /** Returns the enum member name exactly like Enum.ToString(). */
    internal static string EnumName<TEnum>(TEnum value)
        where TEnum : struct, Enum
        => value.ToString();
}
