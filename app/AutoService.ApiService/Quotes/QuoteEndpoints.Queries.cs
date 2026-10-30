using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Pagination;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /** Lists one page of quotes, filtered by vehicle, appointment, status, expired (D7) and search,
     * ordered by CreatedAt descending. */
    private static async Task<IResult> ListQuotesAsync(
        int? vehicleId,
        [Description("Optional: keeps only quotes linked to this appointment.")] int? appointmentId,
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
            if (!DefinedEnum.TryParse<QuoteStatus>(status, out var parsedStatus))
            {
                return ApiProblem.Unprocessable($"Status must be one of: {string.Join(", ", Enum.GetNames<QuoteStatus>())}.");
            }

            statusFilter = parsedStatus;
        }

        var query = db.Quotes.AsNoTracking();

        if (vehicleId is not null)
        {
            query = query.Where(q => q.VehicleId == vehicleId);
        }

        if (appointmentId is not null)
        {
            query = query.Where(q => q.AppointmentId == appointmentId);
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
            .Select(QuoteListItemProjection(nowUtc))
            .ToPagedResultAsync(request, cancellationToken);

        return Results.Ok(result);
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
            .Where(q => q.VehicleId == vehicleId)
            .OrderByDescending(q => q.CreatedAt)
            .ThenBy(q => q.Id)
            .Take(boundedLimit)
            .Select(QuoteListItemProjection(DateTime.UtcNow))
            .ToListAsync(cancellationToken);

        return Results.Ok(quotes);
    }

    /** Returns one quote with its lines as a detail DTO, or 404 when it does not exist. */
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

        var lockReason = await ResolveQuoteLockReasonAsync(quote, db, cancellationToken);
        return Results.Ok(ToQuoteDetailDto(quote, DateTime.UtcNow, lockReason));
    }
}
