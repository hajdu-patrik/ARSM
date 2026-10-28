using Npgsql;

namespace AutoService.ApiService.Maintenance;

/** Creates or updates the DML-only application role in one transaction on a raw connection, outside EF's command logging. */
internal static class AppRoleProvisioner
{
    public static async Task ProvisionAsync(
        string connectionString,
        string password,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var databaseName = new NpgsqlConnectionStringBuilder(connectionString).Database;

        if (string.IsNullOrWhiteSpace(databaseName))
        {
            throw new InvalidOperationException("The connection string 'AutoServiceDb' names no database.");
        }

        logger.LogInformation("Provisioning login role {RoleName} on database {DatabaseName}.", AppRoleProvisioningSql.RoleName, databaseName);

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        var commands = AppRoleProvisioningSql.BuildCommands(databaseName, password);

        try
        {
            foreach (var command in commands)
            {
                command.Connection = connection;
                command.Transaction = transaction;
                await command.ExecuteNonQueryAsync(cancellationToken);
            }
        }
        finally
        {
            foreach (var command in commands)
            {
                await command.DisposeAsync();
            }
        }

        await transaction.CommitAsync(cancellationToken);

        logger.LogInformation("Login role {RoleName} holds only CONNECT, schema USAGE, table DML and sequence use.", AppRoleProvisioningSql.RoleName);
    }
}
