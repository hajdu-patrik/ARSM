using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Pricing;
using System.ComponentModel;

namespace AutoService.ApiService.Catalog;

public static partial class LaborTypeEndpoints
{
    private static readonly LaborTypeCatalog Catalog = new();

    private static Task<IResult> ListLaborTypesAsync(
        [Description("1-based page number; values below 1 become 1. Default 1.")] int? page,
        [Description("Page size, clamped to 1..500. Default 20.")] int? pageSize,
        [Description("Optional case-insensitive substring filter, trimmed, max 100 characters.")] string? search,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
        => Catalog.ListAsync(page, pageSize, search, db, cancellationToken);

    private static Task<IResult> GetLaborTypeAsync(int id, AutoServiceDbContext db, CancellationToken cancellationToken)
        => Catalog.GetAsync(id, db, cancellationToken);

    private static Task<IResult> CreateLaborTypeAsync(
        CreateLaborTypeRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
        => Catalog.CreateAsync(new(request.Code, request.Name, request.HourlyNetRate, request.VatRatePercent), db, cancellationToken);

    private static Task<IResult> UpdateLaborTypeAsync(
        int id,
        UpdateLaborTypeRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
        => Catalog.UpdateAsync(id, new(request.Code, request.Name, request.HourlyNetRate, request.VatRatePercent), request.Version, db, cancellationToken);

    private static Task<IResult> DeleteLaborTypeAsync(int id, AutoServiceDbContext db, CancellationToken cancellationToken)
        => Catalog.DeleteAsync(id, db, cancellationToken);

    private sealed class LaborTypeCatalog() : CatalogItemHandlers<LaborType, LaborTypeDto>(
        nameof(LaborType.Code),
        "/api/labor-types",
        "Labor type not found.",
        "A labor type with this code already exists.",
        "labor_type_version_conflict")
    {
        protected override LaborType Create(CatalogItemInput input)
            => new(input.Key, input.Name, input.NetPrice, input.VatRatePercent);

        protected override void Apply(LaborType laborType, CatalogItemInput input)
        {
            laborType.Code = input.Key;
            laborType.Name = input.Name;
            laborType.HourlyNetRate = input.NetPrice;
            laborType.VatRatePercent = input.VatRatePercent;
        }

        protected override LaborTypeDto ToDto(LaborType laborType) => new(
            laborType.Id,
            laborType.Code,
            laborType.Name,
            laborType.HourlyNetRate,
            PricingCalculator.GrossUnitPrice(laborType.HourlyNetRate, laborType.VatRatePercent),
            laborType.VatRatePercent,
            laborType.Version);
    }
}
