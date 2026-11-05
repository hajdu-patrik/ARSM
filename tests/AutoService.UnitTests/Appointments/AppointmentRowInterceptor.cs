using System.Data;
using System.Data.Common;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace AutoService.UnitTests.Appointments;

/** Serves the editable-appointment load from memory: one row, no mechanics or quotes, and false for an EXISTS probe. */
internal sealed partial class AppointmentRowInterceptor(IReadOnlyDictionary<string, object?> row) : DbCommandInterceptor
{
    [GeneratedRegex("""(\w+)\."?(\w+)"?(?=,|\s+FROM)""")]
    private static partial Regex SelectedColumn();

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
    {
        var table = new DataTable();
        var values = new List<object?>();
        if (command.CommandText.Contains("EXISTS", StringComparison.Ordinal))
        {
            table.Columns.Add("exists", typeof(bool));
            values.Add(false);
        }
        else
        {
            var selectList = command.CommandText[..command.CommandText.IndexOf("FROM", StringComparison.Ordinal)] + " FROM";
            var index = 0;
            foreach (Match column in SelectedColumn().Matches(selectList))
            {
                // Only the first alias holds the appointment, vehicle and customer; the joined mechanics and quotes stay NULL.
                var value = column.Groups[1].Value == "s" ? row.GetValueOrDefault(column.Groups[2].Value) : null;
                table.Columns.Add($"c{index++}", typeof(object));
                values.Add(value ?? DBNull.Value);
            }
        }

        table.Rows.Add(values.ToArray());
        return ValueTask.FromResult(InterceptionResult<DbDataReader>.SuppressWithResult(table.CreateDataReader()));
    }
}
