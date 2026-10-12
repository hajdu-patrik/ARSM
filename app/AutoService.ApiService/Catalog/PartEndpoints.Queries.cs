using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Pagination;
using AutoService.ApiService.Pricing;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel;

namespace AutoService.ApiService.Catalog;

public static partial class PartEndpoints
{
    /** Lists one page of parts ordered by part number, optionally searched by part number or name. */
    private static async Task<IResult> ListPartsAsync(
        [Description("1-based page number; values below 1 become 1. Default 1.")] int? page,
        [Description("Page size, clamped to 1..500. Default 20.")] int? pageSize,
        [Description("Optional case-insensitive substring filter, trimmed, max 100 characters.")] string? search,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var request = ListQueryLimits.NormalizePage(page, pageSize);
        var term = SearchTerm.Normalize(search);

        var query = db.Parts.AsNoTracking();
        if (term is not null)
        {
            query = query.Where(p =>
                p.PartNumber.ToUpper().Contains(term) ||
                p.Name.ToUpper().Contains(term));
        }

        var result = await query
            .OrderBy(p => p.PartNumber)
            .ToPagedResultAsync(request, cancellationToken);

        return Results.Ok(new PagedResult<PartDto>(
            result.Items.Select(ToPartDto).ToList(),
            result.TotalCount,
            result.Page,
            result.PageSize));
    }

    /** Returns a single part by id. */
    private static async Task<IResult> GetPartAsync(
        int id,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var part = await db.Parts
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (part is null)
        {
            return Results.Problem(
                detail: "Part not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        return Results.Ok(ToPartDto(part));
    }

    private static PartDto ToPartDto(Part part) => new(
            part.Id,
            part.PartNumber,
            part.Name,
            part.NetUnitPrice,
            PricingCalculator.GrossUnitPrice(part.NetUnitPrice, part.VatRatePercent),
            part.VatRatePercent);
}
