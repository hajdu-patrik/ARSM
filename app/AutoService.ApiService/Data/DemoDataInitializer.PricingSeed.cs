using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.DataInitialization;

public static partial class DemoDataInitializer
{
    /**
     * Inserts demo parts and labor types that are missing by PartNumber/Code.
     * Runs on every startup and never overwrites an existing row, so a price a
     * developer edited by hand survives a restart.
     *
     * @param db Database context used to check existence and insert missing rows.
     * @param cancellationToken Token used to cancel the seeding I/O.
     * @return A task that completes when the pricing catalog seed has converged.
     */
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
