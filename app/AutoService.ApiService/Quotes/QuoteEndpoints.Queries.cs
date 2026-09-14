using AutoService.ApiService.Data;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /**
     * Lists quotes, optionally filtered by vehicle and/or status (D43: only
     * the four real enum values are accepted; Expired is a DTO-level flag,
     * never a filter value), ordered by CreatedAt descending.
     *
     * @param vehicleId Optional vehicle filter.
     * @param status Optional status filter (Draft/Sent/Accepted/Rejected).
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @returns Quote list, or 422 when status is not a recognized value.
     */
    private static async Task<IResult> ListQuotesAsync(
        int? vehicleId,
        string? status,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
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
            .ToListAsync(cancellationToken);

        var nowUtc = DateTime.UtcNow;
        return Results.Ok(quotes.Select(q => ToQuoteListItemDto(q, nowUtc)).ToList());
    }

    /**
     * Lists a vehicle's quotes, ordered by CreatedAt descending.
     *
     * @param vehicleId Target vehicle identifier.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @returns Quote list, or 404 when the vehicle does not exist.
     */
    private static async Task<IResult> GetByVehicleAsync(
        int vehicleId,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
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
            .ToListAsync(cancellationToken);

        var nowUtc = DateTime.UtcNow;
        return Results.Ok(quotes.Select(q => ToQuoteListItemDto(q, nowUtc)).ToList());
    }

    /**
     * Returns a single quote with its lines and totals.
     *
     * @param id Quote identifier.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @returns Quote detail, or 404 when it does not exist.
     */
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
