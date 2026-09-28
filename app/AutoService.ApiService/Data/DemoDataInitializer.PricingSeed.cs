using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.DataInitialization;

public static partial class DemoDataInitializer
{
    /** Inserts demo parts/labor types missing by PartNumber/Code; runs every startup and
     * never overwrites an existing row, so a hand-edited price survives a restart. */
    private static async Task EnsurePricingCatalogSeededAsync(AutoServiceDbContext db, CancellationToken cancellationToken)
    {
        var existingPartNumbers = await db.Parts
            .Select(p => p.PartNumber)
            .ToListAsync(cancellationToken);
        var existingPartNumberSet = existingPartNumbers.ToHashSet(StringComparer.Ordinal);

        var missingParts = DemoDataPricingSeedFactory.CreateParts()
            .Where(p => !existingPartNumberSet.Contains(p.PartNumber))
            .ToList();

        if (missingParts.Count > 0)
        {
            db.Parts.AddRange(missingParts);
        }

        var existingLaborTypeCodes = await db.LaborTypes
            .Select(l => l.Code)
            .ToListAsync(cancellationToken);
        var existingLaborTypeCodeSet = existingLaborTypeCodes.ToHashSet(StringComparer.Ordinal);

        var missingLaborTypes = DemoDataPricingSeedFactory.CreateLaborTypes()
            .Where(l => !existingLaborTypeCodeSet.Contains(l.Code))
            .ToList();

        if (missingLaborTypes.Count > 0)
        {
            db.LaborTypes.AddRange(missingLaborTypes);
        }

        if (missingParts.Count > 0 || missingLaborTypes.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
