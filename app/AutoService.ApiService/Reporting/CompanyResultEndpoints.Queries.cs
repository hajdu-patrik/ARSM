using AutoService.ApiService.Data;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Reporting;

public static partial class CompanyResultEndpoints
{
    private const int MinimumYear = 2000;
    private const int MaximumYear = 2100;

    /** Returns the revenue report for a year or one month; period cut in UTC (D28), and an
     * empty period answers 200 with zeros rather than 404 (CLAUDE.md Company Result Anchors). */
    private static async Task<IResult> GetCompanyResultsAsync(
        int? year,
        int? month,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;
        var resolvedYear = year ?? nowUtc.Year;

        if (resolvedYear < MinimumYear || resolvedYear > MaximumYear || month is < 1 or > 12)
        {
            return Results.BadRequest(new
            {
                code = "invalid_date_range",
                error = $"Year must be {MinimumYear}-{MaximumYear}, month must be 1-12.",
            });
        }

        var rangeStart = new DateTime(resolvedYear, month ?? 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var rangeEnd = month is null ? rangeStart.AddYears(1) : rangeStart.AddMonths(1);

        var periodQuotes = db.Quotes
            .AsNoTracking()
            .Where(q => q.CreatedAt >= rangeStart && q.CreatedAt < rangeEnd);

        var statusTotals = await LoadStatusTotalsAsync(periodQuotes, nowUtc, cancellationToken);
        var months = await LoadMonthsAsync(periodQuotes, resolvedYear, month, cancellationToken);
        var acceptedLines = db.QuoteLines
            .AsNoTracking()
            .Where(l => l.Quote.Status == QuoteStatus.Accepted
                && l.Quote.CreatedAt >= rangeStart
                && l.Quote.CreatedAt < rangeEnd);

        return Results.Ok(new CompanyResultDto(
            resolvedYear,
            month,
            statusTotals.Accepted,
            statusTotals.Pending,
            statusTotals.Expired,
            statusTotals.Rejected,
            statusTotals.DraftQuoteCount,
            await LoadLineKindRowsAsync(acceptedLines, cancellationToken),
            months,
            await LoadVatRowsAsync(acceptedLines, cancellationToken)));
    }

    /** The four status rows plus the draft count, aggregated in one round trip. */
    private sealed record CompanyResultStatusTotals(
        CompanyResultStatusRowDto Accepted,
        CompanyResultStatusRowDto Pending,
        CompanyResultStatusRowDto Expired,
        CompanyResultStatusRowDto Rejected,
        int DraftQuoteCount);

    /** Sums the four status rows from stored totals; pending/expired split at query time via
     * ValidUntil < now (no stored Expired status), so the report ages with the calendar. */
    private static async Task<CompanyResultStatusTotals> LoadStatusTotalsAsync(
        IQueryable<Domain.Quote> periodQuotes,
        DateTime nowUtc,
        CancellationToken cancellationToken)
    {
        var totals = await periodQuotes
            .GroupBy(_ => 1)
            .Select(g => new
            {
                AcceptedCount = g.Count(q => q.Status == QuoteStatus.Accepted),
                AcceptedNet = g.Sum(q => q.Status == QuoteStatus.Accepted ? q.TotalNet : 0m),
                AcceptedGross = g.Sum(q => q.Status == QuoteStatus.Accepted ? q.TotalGross : 0m),
                PendingCount = g.Count(q => q.Status == QuoteStatus.Sent && q.ValidUntil >= nowUtc),
                PendingNet = g.Sum(q => q.Status == QuoteStatus.Sent && q.ValidUntil >= nowUtc ? q.TotalNet : 0m),
                PendingGross = g.Sum(q => q.Status == QuoteStatus.Sent && q.ValidUntil >= nowUtc ? q.TotalGross : 0m),
                ExpiredCount = g.Count(q => q.Status == QuoteStatus.Sent && q.ValidUntil < nowUtc),
                ExpiredNet = g.Sum(q => q.Status == QuoteStatus.Sent && q.ValidUntil < nowUtc ? q.TotalNet : 0m),
                ExpiredGross = g.Sum(q => q.Status == QuoteStatus.Sent && q.ValidUntil < nowUtc ? q.TotalGross : 0m),
                RejectedCount = g.Count(q => q.Status == QuoteStatus.Rejected),
                RejectedNet = g.Sum(q => q.Status == QuoteStatus.Rejected ? q.TotalNet : 0m),
                RejectedGross = g.Sum(q => q.Status == QuoteStatus.Rejected ? q.TotalGross : 0m),
                DraftCount = g.Count(q => q.Status == QuoteStatus.Draft),
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (totals is null)
        {
            var empty = new CompanyResultStatusRowDto(0, 0m, 0m);
            return new CompanyResultStatusTotals(empty, empty, empty, empty, 0);
        }

        return new CompanyResultStatusTotals(
            new CompanyResultStatusRowDto(totals.AcceptedCount, totals.AcceptedNet, totals.AcceptedGross),
            new CompanyResultStatusRowDto(totals.PendingCount, totals.PendingNet, totals.PendingGross),
            new CompanyResultStatusRowDto(totals.ExpiredCount, totals.ExpiredNet, totals.ExpiredGross),
            new CompanyResultStatusRowDto(totals.RejectedCount, totals.RejectedNet, totals.RejectedGross),
            totals.DraftCount);
    }

    /** Builds the monthly breakdown of accepted quotes; every month is present (zeros if empty),
     * so the frontend renders one list without branching on gaps. */
    private static async Task<List<CompanyResultMonthDto>> LoadMonthsAsync(
        IQueryable<Domain.Quote> periodQuotes,
        int year,
        int? month,
        CancellationToken cancellationToken)
    {
        var accepted = await periodQuotes
            .Where(q => q.Status == QuoteStatus.Accepted)
            .GroupBy(q => q.CreatedAt.Month)
            .Select(g => new
            {
                Month = g.Key,
                QuoteCount = g.Count(),
                Net = g.Sum(q => q.TotalNet),
                Gross = g.Sum(q => q.TotalGross),
            })
            .ToListAsync(cancellationToken);

        var monthsInPeriod = month is null ? Enumerable.Range(1, 12) : [month.Value];

        return monthsInPeriod
            .Select(periodMonth =>
            {
                var match = accepted.Find(row => row.Month == periodMonth);
                return new CompanyResultMonthDto(
                    periodMonth,
                    match?.QuoteCount ?? 0,
                    match?.Net ?? 0m,
                    match?.Gross ?? 0m);
            })
            .ToList();
    }

    /** Splits the accepted revenue into parts and labor, from the stored line amounts. */
    private static async Task<List<CompanyResultLineKindRowDto>> LoadLineKindRowsAsync(
        IQueryable<Domain.QuoteLine> acceptedLines,
        CancellationToken cancellationToken)
    {
        var rows = await acceptedLines
            .GroupBy(l => l.LineKind)
            .Select(g => new
            {
                LineKind = g.Key,
                Net = g.Sum(l => l.NetAmount),
                Gross = g.Sum(l => l.GrossAmount),
            })
            .ToListAsync(cancellationToken);

        return rows
            .OrderBy(row => row.LineKind)
            .Select(row => new CompanyResultLineKindRowDto(row.LineKind.ToString(), row.Net, row.Gross))
            .ToList();
    }

    /** Groups the accepted revenue per VAT rate. */
    private static async Task<List<CompanyResultVatRowDto>> LoadVatRowsAsync(
        IQueryable<Domain.QuoteLine> acceptedLines,
        CancellationToken cancellationToken)
    {
        return await acceptedLines
            .GroupBy(l => l.VatRatePercent)
            .OrderBy(g => g.Key)
            .Select(g => new CompanyResultVatRowDto(
                g.Key,
                g.Sum(l => l.NetAmount),
                g.Sum(l => l.VatAmount)))
            .ToListAsync(cancellationToken);
    }
}
