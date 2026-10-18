using AutoService.ApiService.Configuration;
using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.CompanyProfiles;

/** One-time startup seed of the letterhead row from configuration; an existing row always wins. */
public static class CompanyProfileSeeder
{
    /** Seeds the row when the table is empty; throws (fail fast) when the table and the configuration are both empty. */
    public static async Task EnsureCompanyProfileAsync(this WebApplication app, CancellationToken cancellationToken = default)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoServiceDbContext>();

        if (await db.CompanyProfiles.AnyAsync(cancellationToken))
        {
            return;
        }

        var seed = CompanyProfileResolver.Resolve(app.Configuration);
        var row = new CompanyProfileEntity();
        row.Apply(seed);
        db.CompanyProfiles.Add(row);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Another instance seeded the single row first; anything else is rethrown.
            if (!await db.CompanyProfiles.AsNoTracking().AnyAsync(cancellationToken))
            {
                throw;
            }
        }
    }
}
