using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Pricing;
using System.ComponentModel;

namespace AutoService.ApiService.Catalog;

public static partial class PartEndpoints
{
    private static readonly PartCatalog Catalog = new();

    private static Task<IResult> ListPartsAsync(
        [Description("1-based page number; values below 1 become 1. Default 1.")] int? page,
        [Description("Page size, clamped to 1..500. Default 20.")] int? pageSize,
        [Description("Optional case-insensitive substring filter, trimmed, max 100 characters.")] string? search,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
        => Catalog.ListAsync(page, pageSize, search, db, cancellationToken);

    private static Task<IResult> GetPartAsync(int id, AutoServiceDbContext db, CancellationToken cancellationToken)
        => Catalog.GetAsync(id, db, cancellationToken);

    private static Task<IResult> CreatePartAsync(
        CreatePartRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
        => Catalog.CreateAsync(new(request.PartNumber, request.Name, request.NetUnitPrice, request.VatRatePercent), db, cancellationToken);

    private static Task<IResult> UpdatePartAsync(
        int id,
        UpdatePartRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
        => Catalog.UpdateAsync(id, new(request.PartNumber, request.Name, request.NetUnitPrice, request.VatRatePercent), request.Version, db, cancellationToken);

    private static Task<IResult> DeletePartAsync(int id, AutoServiceDbContext db, CancellationToken cancellationToken)
        => Catalog.DeleteAsync(id, db, cancellationToken);

    private sealed class PartCatalog() : CatalogItemHandlers<Part, PartDto>(
        nameof(Part.PartNumber),
        "/api/parts",
        "Part not found.",
        "A part with this part number already exists.",
        "part_version_conflict")
    {
        protected override Part Create(CatalogItemInput input)
            => new(input.Key, input.Name, input.NetPrice, input.VatRatePercent);

        protected override void Apply(Part part, CatalogItemInput input)
        {
            part.PartNumber = input.Key;
            part.Name = input.Name;
            part.NetUnitPrice = input.NetPrice;
            part.VatRatePercent = input.VatRatePercent;
        }

        protected override PartDto ToDto(Part part) => new(
            part.Id,
            part.PartNumber,
            part.Name,
            part.NetUnitPrice,
            PricingCalculator.GrossUnitPrice(part.NetUnitPrice, part.VatRatePercent),
            part.VatRatePercent,
            part.Version);
    }
}
