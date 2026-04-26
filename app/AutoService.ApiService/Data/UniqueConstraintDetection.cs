using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AutoService.ApiService.Data;

internal static class UniqueConstraintDetection
{
    internal static bool IsUniqueConstraintViolation(DbUpdateException exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                return true;
            }
        }

        return false;
    }
}
