using AutoService.ApiService.Data;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Pagination;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /** Lists one page of quotes, filtered by vehicle, status (the four stored values), expired
     * (a Sent quote past ValidUntil, D7) and search, ordered by CreatedAt descending. */
    private static async Task<IResult> ListQuotesAsync(
        int? vehicleId,
        string? status,
        [Description("Optional: true keeps only expired quotes (Sent and past ValidUntil), false excludes them.")] bool? expired,
        [Description("1-based page number; values below 1 become 1. Default 1.")] int? page,
        [Description("Page size, clamped to 1..500. Default 20.")] int? pageSize,
        [Description("Optional case-insensitive substring filter, trimmed, max 100 characters.")] string? search,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var request = ListQueryLimits.NormalizePage(page, pageSize);
        var term = SearchTerm.Normalize(search);

        QuoteStatus? statusFilter = null;
        if (status is not null)
        {
            if (!Enum.TryParse<QuoteStatus>(status, ignoreCase: true, out var parsedStatus))
            {
                return ApiProblem.Unprocessable($"Status must be one of: {string.Join(", ", Enum.GetNames<QuoteStatus>())}.");
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

        var nowUtc = DateTime.UtcNow;
        if (expired is not null)
        {
            query = expired.Value
                ? query.Where(q => q.Status == QuoteStatus.Sent && q.ValidUntil < nowUtc)
                : query.Where(q => !(q.Status == QuoteStatus.Sent && q.ValidUntil < nowUtc));
        }

        if (term is not null)
        {
            query = query.Where(q =>
                q.QuoteNumber.ToUpper().Contains(term) ||
                q.Title.ToUpper().Contains(term) ||
                q.Vehicle.LicensePlate.ToUpper().Contains(term));
        }

        var result = await query
            .OrderByDescending(q => q.CreatedAt)
            .ThenBy(q => q.Id)
            .ToPagedResultAsync(request, cancellationToken);

        return Results.Ok(result.Map(q => ToQuoteListItemDto(q, nowUtc)));
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
            return ApiProblem.NotFound("Vehicle not found.");
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
        var quote = await IncludeDetails(db.Quotes.AsNoTracking())
            .FirstOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (quote is null)
        {
            return ApiProblem.NotFound("Quote not found.");
        }

        return Results.Ok(ToQuoteDetailDto(quote, DateTime.UtcNow));
    }
}
