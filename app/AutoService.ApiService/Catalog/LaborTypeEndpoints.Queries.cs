using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Pagination;
using AutoService.ApiService.Pricing;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Catalog;

public static partial class LaborTypeEndpoints
{
    /**
     * Lists labor types ordered by code.
     *
     * @param limit Optional row cap (1..500, default 500).
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @returns Labor type list.
     */
    private static async Task<IResult> ListLaborTypesAsync(
        int? limit,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var boundedLimit = ListQueryLimits.Normalize(limit);

        var laborTypes = await db.LaborTypes
            .AsNoTracking()
            .OrderBy(l => l.Code)
            .Take(boundedLimit)
            .ToListAsync(cancellationToken);

        return Results.Ok(laborTypes.Select(ToLaborTypeDto).ToList());
    }

    /**
     * Returns a single labor type by id.
     *
     * @param id Labor type identifier.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @returns Labor type detail, or 404 when it does not exist.
     */
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
