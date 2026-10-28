using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.DataInitialization;

/** Startup database preparation: migrations, the legacy backfill cleanup and data normalization; it seeds no data. */
public static partial class DatabaseInitializer
{
    // Azure sets it to false and migrates through the --migrate-database job instead.
    public const string MigrateOnStartupKey = "Database:MigrateOnStartup";

    /** True unless Database:MigrateOnStartup is false, so local, CI and test stacks keep migrating at startup. */
    public static bool IsMigrateOnStartupEnabled(IConfiguration configuration)
        => configuration.GetValue(MigrateOnStartupKey, defaultValue: true);

    /** Applies pending migrations, then repairs and normalizes persisted data before the API serves requests. */
    public static async Task EnsureDatabaseReadyAsync(this WebApplication app, CancellationToken cancellationToken = default)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoServiceDbContext>();

        await db.Database.MigrateAsync(cancellationToken);
        await ResetLegacyBackfillDatasetWhenUnownedAsync(db, cancellationToken);
        await EnsureNoAppointmentsWithoutMechanicsAsync(db, cancellationToken);
        await NormalizePersistedDataAsync(db, cancellationToken);
    }
}
