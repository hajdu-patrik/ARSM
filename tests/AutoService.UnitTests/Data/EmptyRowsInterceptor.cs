using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace AutoService.UnitTests.Data;

/** Answers every query with no rows, so a lookup finds nothing; pair it with NoConnectionInterceptor. */
internal sealed class EmptyRowsInterceptor : DbCommandInterceptor
{
    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
    {
        var table = new DataTable();
        table.Columns.Add("c", typeof(object));
        return ValueTask.FromResult(InterceptionResult<DbDataReader>.SuppressWithResult(table.CreateDataReader()));
    }
}
