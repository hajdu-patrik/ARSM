namespace AutoService.ApiService.Catalog;

public static partial class LaborTypeEndpoints
{
    /** Version is the xmin the client must send back on an update (Data/OptimisticConcurrency). */
    internal sealed record LaborTypeDto(
        int Id,
        string Code,
        string Name,
        decimal HourlyNetRate,
        decimal GrossHourlyRate,
        int VatRatePercent,
        uint Version);

    internal sealed record CreateLaborTypeRequest(
        string Code,
        string Name,
        decimal HourlyNetRate,
        int VatRatePercent);

    internal sealed record UpdateLaborTypeRequest(
        string Code,
        string Name,
        decimal HourlyNetRate,
        int VatRatePercent,
        uint Version);
}
