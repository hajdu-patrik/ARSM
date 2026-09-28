using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Quotes;

/** Generates unique, year-scoped quote numbers (ARSM-{yyyy}-{0000}, D13), retrying on a concurrent-insert collision (CLAUDE.md Quote Anchors). */
internal sealed class QuoteNumberGenerator
{
    // The unique index on QuoteNumber is the real source of truth; this sequence lookup
    // only reduces collisions. Five attempts bounds the race without retrying forever.
    private const int MaxAttempts = 5;

    private readonly AutoServiceDbContext dbContext;

    internal QuoteNumberGenerator(AutoServiceDbContext dbContext)
    {
        this.dbContext = dbContext;
    }

    /** Assigns a freshly generated quote number, adds it to the context, and saves it; retries
     * with a new candidate up to MaxAttempts times if a concurrent insert claimed the previous one. */
    internal async Task<Quote> CreateAsync(Quote quote, CancellationToken cancellationToken)
    {
        dbContext.Quotes.Add(quote);

        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            quote.QuoteNumber = await BuildCandidateNumberAsync(cancellationToken);

            try
            {
                await dbContext.SaveChangesAsync(cancellationToken);
                return quote;
            }
            catch (DbUpdateException ex) when (UniqueConstraintDetection.IsUniqueConstraintViolation(ex) && attempt < MaxAttempts)
            {
                // Another insert claimed this candidate; the quote stays tracked as Added, so the
                // next SaveChangesAsync retry re-attempts the insert with a fresh QuoteNumber.
            }
        }

        // Unreachable: the loop always returns on success or rethrows once attempt reaches
        // MaxAttempts; this only satisfies the compiler's need for a return on every path.
        throw new InvalidOperationException($"Failed to generate a unique quote number after {MaxAttempts} attempts.");
    }

    /** Computes the next sequence number for the current UTC year and formats it as ARSM-{yyyy}-{0000}; the sequence restarts every year. */
    private async Task<string> BuildCandidateNumberAsync(CancellationToken cancellationToken)
    {
        var yearPrefix = $"ARSM-{DateTime.UtcNow.Year}-";

        // Zero-padded to 4 digits so lexicographic order equals numeric order: ordering by
        // QuoteNumber desc and taking the first row is the max, in one row instead of the whole year.
        var highestQuoteNumber = await dbContext.Quotes
            .AsNoTracking()
            .Where(q => q.QuoteNumber.StartsWith(yearPrefix))
            .OrderByDescending(q => q.QuoteNumber)
            .Select(q => q.QuoteNumber)
            .FirstOrDefaultAsync(cancellationToken);

        var nextSequence = highestQuoteNumber is null
            ? 1
            : int.Parse(highestQuoteNumber[yearPrefix.Length..]) + 1;

        return $"{yearPrefix}{nextSequence:D4}";
    }
}
