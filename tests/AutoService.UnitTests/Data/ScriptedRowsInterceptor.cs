using System.Data;
using System.Data.Common;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace AutoService.UnitTests.Data;

/** Answers every query from memory: the scripted row for an entity select, false for an EXISTS probe, and no connection. */
internal sealed partial class ScriptedRowsInterceptor(IReadOnlyDictionary<string, object?> entityRow) : DbCommandInterceptor
{
    [GeneratedRegex("""\.("[A-Za-z]+"|[A-Za-z]+)(?=,|\s+FROM)""")]
    private static partial Regex SelectedColumn();

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
    {
        var table = new DataTable();
        var row = new List<object?>();
        if (command.CommandText.Contains("EXISTS", StringComparison.Ordinal))
        {
            table.Columns.Add("exists", typeof(bool));
            row.Add(false);
        }
        else
        {
            var selectList = command.CommandText[..command.CommandText.IndexOf("FROM", StringComparison.Ordinal)];
            foreach (Match column in SelectedColumn().Matches(selectList + " FROM"))
            {
                var name = column.Groups[1].Value.Trim('"');
                var value = entityRow.GetValueOrDefault(name) ?? DBNull.Value;
                table.Columns.Add(name, typeof(object));
                row.Add(value);
            }
        }

        table.Rows.Add(row.ToArray());
        return ValueTask.FromResult(InterceptionResult<DbDataReader>.SuppressWithResult(table.CreateDataReader()));
    }
}

/** Lets a context run its queries without a reachable database by never opening the connection. */
internal sealed class NoConnectionInterceptor : DbConnectionInterceptor
{
    public override InterceptionResult ConnectionOpening(DbConnection connection, ConnectionEventData eventData, InterceptionResult result)
        => InterceptionResult.Suppress();

    public override ValueTask<InterceptionResult> ConnectionOpeningAsync(
        DbConnection connection, ConnectionEventData eventData, InterceptionResult result, CancellationToken cancellationToken = default)
        => ValueTask.FromResult(InterceptionResult.Suppress());
}
