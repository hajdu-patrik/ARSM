namespace AutoService.ApiService.Catalog;

public static partial class LaborTypeEndpoints
{
    internal sealed record LaborTypeDto(
        int Id,
        string Code,
        string Name,
        decimal HourlyNetRate,
        decimal GrossHourlyRate,
        int VatRatePercent);

    internal sealed record CreateLaborTypeRequest(
        string Code,
        string Name,
        decimal HourlyNetRate,
        int VatRatePercent);

    internal sealed record UpdateLaborTypeRequest(
        string Code,
        string Name,
        decimal HourlyNetRate,
        int VatRatePercent);
}
