using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Pagination;
using AutoService.ApiService.Pricing;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Catalog;

public static partial class PartEndpoints
{
    /** Lists parts ordered by part number. */
    private static async Task<IResult> ListPartsAsync(
        int? limit,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var boundedLimit = ListQueryLimits.Normalize(limit);

        var parts = await db.Parts
            .AsNoTracking()
            .OrderBy(p => p.PartNumber)
            .Take(boundedLimit)
            .ToListAsync(cancellationToken);

        return Results.Ok(parts.Select(ToPartDto).ToList());
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
