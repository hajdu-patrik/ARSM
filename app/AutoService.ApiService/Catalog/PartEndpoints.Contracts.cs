namespace AutoService.ApiService.Catalog;

public static partial class PartEndpoints
{
    internal sealed record PartDto(
        int Id,
        string PartNumber,
        string Name,
        decimal NetUnitPrice,
        decimal GrossUnitPrice,
        int VatRatePercent);

    internal sealed record CreatePartRequest(
        string PartNumber,
        string Name,
        decimal NetUnitPrice,
        int VatRatePercent);

    internal sealed record UpdatePartRequest(
        string PartNumber,
        string Name,
        decimal NetUnitPrice,
        int VatRatePercent);
}
