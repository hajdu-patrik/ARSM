using Npgsql;

namespace AutoService.ApiService.Maintenance;

/** Statements that create or update the DML-only login role; the password travels only as a bound parameter. */
internal static class AppRoleProvisioningSql
{
    // Must match the Username of the API's db-connection secret in deploy/azure/main.bicep.
    public const string RoleName = "arsm_app";

    public const string PasswordParameterName = "password";

    // Transaction-local placeholder setting the DO block reads, so no command text carries the password.
    private const string PasswordSettingName = "arsm.app_role_password";

    private const string StorePasswordStatement =
        "SELECT set_config('" + PasswordSettingName + "', @" + PasswordParameterName + ", true)";

    private const string UpsertRoleStatement = $$"""
        DO $arsm$
        BEGIN
            IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '{{RoleName}}') THEN
                EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', '{{RoleName}}', current_setting('{{PasswordSettingName}}'));
            ELSE
                EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', '{{RoleName}}', current_setting('{{PasswordSettingName}}'));
            END IF;
        END
        $arsm$
        """;

    /** Every command in execution order; none is bound to a connection yet. */
    public static IReadOnlyList<NpgsqlCommand> BuildCommands(string databaseName, string password)
    {
        var storePassword = new NpgsqlCommand(StorePasswordStatement);
        storePassword.Parameters.AddWithValue(PasswordParameterName, password);

        return [storePassword, new NpgsqlCommand(UpsertRoleStatement), .. BuildGrantStatements(databaseName).Select(static sql => new NpgsqlCommand(sql))];
    }

    /** The grants, and only these: connect, schema usage, DML on tables, sequence use, and the same for later objects. */
    public static IReadOnlyList<string> BuildGrantStatements(string databaseName)
    {
        return
        [
            $"GRANT CONNECT ON DATABASE {QuoteIdentifier(databaseName)} TO {RoleName}",
            $"GRANT USAGE ON SCHEMA public TO {RoleName}",
            $"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {RoleName}",
            $"GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO {RoleName}",
            $"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {RoleName}",
            $"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO {RoleName}",
        ];
    }

    /** Quotes a PostgreSQL identifier: wraps it in double quotes and doubles every embedded double quote. */
    public static string QuoteIdentifier(string identifier)
    {
        if (string.IsNullOrEmpty(identifier) || identifier.Contains('\0'))
        {
            throw new ArgumentException("A PostgreSQL identifier must be non-empty and free of NUL characters.", nameof(identifier));
        }

        return "\"" + identifier.Replace("\"", "\"\"", StringComparison.Ordinal) + "\"";
    }
}
