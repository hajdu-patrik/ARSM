using AutoService.ApiService.Data;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Pagination;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /** Lists quotes, optionally filtered by vehicle and/or status (D43: only the four real enum
     * values; Expired is a DTO-level flag, never a filter value), ordered by CreatedAt descending. */
    private static async Task<IResult> ListQuotesAsync(
        int? vehicleId,
        string? status,
        int? limit,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var boundedLimit = ListQueryLimits.Normalize(limit);

        QuoteStatus? statusFilter = null;
        if (status is not null)
        {
            if (!Enum.TryParse<QuoteStatus>(status, ignoreCase: true, out var parsedStatus))
            {
                return Results.Problem(
                    detail: $"Status must be one of: {string.Join(", ", Enum.GetNames<QuoteStatus>())}.",
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            statusFilter = parsedStatus;
        }

        var query = db.Quotes
            .AsNoTracking()
            .Include(q => q.Vehicle)
            .Include(q => q.CreatedByMechanic)
            .AsQueryable();

        if (vehicleId is not null)
        {
            query = query.Where(q => q.VehicleId == vehicleId);
        }

        if (statusFilter is not null)
        {
            query = query.Where(q => q.Status == statusFilter);
        }

        var quotes = await query
            .OrderByDescending(q => q.CreatedAt)
            .ThenBy(q => q.Id)
            .Take(boundedLimit)
            .ToListAsync(cancellationToken);

        var nowUtc = DateTime.UtcNow;
        return Results.Ok(quotes.Select(q => ToQuoteListItemDto(q, nowUtc)).ToList());
    }

    /** Lists a vehicle's quotes, ordered by CreatedAt descending. */
    private static async Task<IResult> GetByVehicleAsync(
        int vehicleId,
        int? limit,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var boundedLimit = ListQueryLimits.Normalize(limit);

        var vehicleExists = await db.Vehicles.AnyAsync(v => v.Id == vehicleId, cancellationToken);
        if (!vehicleExists)
        {
            return Results.Problem(detail: "Vehicle not found.", statusCode: StatusCodes.Status404NotFound);
        }

        var quotes = await db.Quotes
            .AsNoTracking()
            .Include(q => q.Vehicle)
            .Include(q => q.CreatedByMechanic)
            .Where(q => q.VehicleId == vehicleId)
            .OrderByDescending(q => q.CreatedAt)
            .ThenBy(q => q.Id)
            .Take(boundedLimit)
            .ToListAsync(cancellationToken);

        var nowUtc = DateTime.UtcNow;
        return Results.Ok(quotes.Select(q => ToQuoteListItemDto(q, nowUtc)).ToList());
    }

    /** Returns a single quote with its lines and totals. */
    private static async Task<IResult> GetQuoteAsync(
        int id,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var quote = await db.Quotes
            .AsNoTracking()
            .Include(q => q.Vehicle)
            .Include(q => q.CreatedByMechanic)
            .Include(q => q.Lines)
            .FirstOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (quote is null)
        {
            return Results.Problem(detail: "Quote not found.", statusCode: StatusCodes.Status404NotFound);
        }

        return Results.Ok(ToQuoteDetailDto(quote, DateTime.UtcNow));
    }
}
