using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Pagination;
using AutoService.ApiService.Pricing;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel;

namespace AutoService.ApiService.Catalog;

public static partial class LaborTypeEndpoints
{
    /** Lists one page of labor types ordered by code, optionally searched by code or name. */
    private static async Task<IResult> ListLaborTypesAsync(
        [Description("1-based page number; values below 1 become 1. Default 1.")] int? page,
        [Description("Page size, clamped to 1..500. Default 20.")] int? pageSize,
        [Description("Optional case-insensitive substring filter, trimmed, max 100 characters.")] string? search,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var request = ListQueryLimits.NormalizePage(page, pageSize);
        var term = SearchTerm.Normalize(search);

        var query = db.LaborTypes.AsNoTracking();
        if (term is not null)
        {
            query = query.Where(l =>
                l.Code.ToUpper().Contains(term) ||
                l.Name.ToUpper().Contains(term));
        }

        var result = await query
            .OrderBy(l => l.Code)
            .ToPagedResultAsync(request, cancellationToken);

        return Results.Ok(new PagedResult<LaborTypeDto>(
            result.Items.Select(ToLaborTypeDto).ToList(),
            result.TotalCount,
            result.Page,
            result.PageSize));
    }

    /** Returns a single labor type by id. */
    private static async Task<IResult> GetLaborTypeAsync(
        int id,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var laborType = await db.LaborTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);

        if (laborType is null)
        {
            return Results.Problem(
                detail: "Labor type not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        return Results.Ok(ToLaborTypeDto(laborType));
    }

    private static LaborTypeDto ToLaborTypeDto(LaborType laborType) => new(
            laborType.Id,
            laborType.Code,
            laborType.Name,
            laborType.HourlyNetRate,
            PricingCalculator.GrossUnitPrice(laborType.HourlyNetRate, laborType.VatRatePercent),
            laborType.VatRatePercent);
}
