namespace AutoService.ApiService.Normalization;

/** Normalizes request dates to UTC; Unspecified counts as UTC, because JSON deserializers often strip the Kind. */
internal static class DateTimeNormalization
{
    internal static DateTime ToUtc(DateTime dateTime) => dateTime.Kind switch
    {
        DateTimeKind.Utc => dateTime,
        DateTimeKind.Local => dateTime.ToUniversalTime(),
        _ => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc)
    };
}
