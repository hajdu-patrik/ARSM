using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Pricing;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Catalog;

public static partial class LaborTypeEndpoints
{
    private static async Task<IResult> ListLaborTypesAsync(
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var laborTypes = await db.LaborTypes
            .AsNoTracking()
            .OrderBy(l => l.Code)
            .ToListAsync(cancellationToken);

        return Results.Ok(laborTypes.Select(ToLaborTypeDto).ToList());
    }

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
