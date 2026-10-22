namespace AutoService.ApiService.Catalog;

public static partial class PartEndpoints
{
    /** Version is the xmin the client must send back on an update (Data/OptimisticConcurrency). */
    internal sealed record PartDto(
        int Id,
        string PartNumber,
        string Name,
        decimal NetUnitPrice,
        decimal GrossUnitPrice,
        int VatRatePercent,
        uint Version);

    internal sealed record CreatePartRequest(
        string PartNumber,
        string Name,
        decimal NetUnitPrice,
        int VatRatePercent);

    internal sealed record UpdatePartRequest(
        string PartNumber,
        string Name,
        decimal NetUnitPrice,
        int VatRatePercent,
        uint Version);
}
