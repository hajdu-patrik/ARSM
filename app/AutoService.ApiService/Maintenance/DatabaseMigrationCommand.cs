using AutoService.ApiService.Configuration;
using AutoService.ApiService.DataInitialization;
using Npgsql;

namespace AutoService.ApiService.Maintenance;

/** Command mode of the Azure migration job: migrates as the administrator, then provisions the DML-only app role. */
public static class DatabaseMigrationCommand
{
    // Argument that switches the host from serving requests to migrating the database.
    public const string CommandArgument = "--migrate-database";

    // Read only by this command (env Database__AppRolePassword); its value is never logged.
    public const string AppRolePasswordKey = "Database:AppRolePassword";

    /** True when the process was started to migrate the database instead of the web host. */
    public static bool IsRequested(string[] args)
        => args.Contains(CommandArgument, StringComparer.Ordinal);

    /** Runs the startup migration steps and the role provisioning; exit code 0 on success, 1 on any failure. */
    public static async Task<int> RunAsync(WebApplication app, CancellationToken cancellationToken)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(DatabaseMigrationCommand));
        var password = app.Configuration[AppRolePasswordKey];
        var passwordProblem = GetPasswordProblem(password);

        if (passwordProblem is not null)
        {
            logger.LogError("Database migration not started: {SettingKey} {Problem}.", AppRolePasswordKey, passwordProblem);
            return 1;
        }

        try
        {
            logger.LogInformation("Applying migrations and normalizing persisted data.");
            await app.EnsureDatabaseReadyAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Database migration failed; the application role was not touched.");
            return 1;
        }

        try
        {
            var connectionString = ConnectionStringResolver.Resolve(app.Configuration);
            await AppRoleProvisioner.ProvisionAsync(connectionString, password!, logger, cancellationToken);
        }
        catch (Exception exception)
        {
            // Type and SQLSTATE only: a server error context can echo the statement that carried the password.
            var sqlState = exception is PostgresException postgresException ? postgresException.SqlState : "none";
            logger.LogError("Role provisioning failed and was rolled back ({FailureType}, SQLSTATE {SqlState}).", exception.GetType().Name, sqlState);
            return 1;
        }

        logger.LogInformation("Database migration and role provisioning finished.");
        return 0;
    }

    /** Why the configured app-role password is unusable, or null when it can be used. */
    internal static string? GetPasswordProblem(string? password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return "is missing";
        }

        return TemplateMarkerDetector.ContainsTemplateMarker(password)
            ? "still contains a template placeholder marker"
            : null;
    }
}
