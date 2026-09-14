using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Quotes;

/**
 * Generates unique, year-scoped quote numbers (ARSM-{yyyy}-{0000}, D13) and
 * persists a new quote under that number, retrying if a concurrent insert
 * wins the same candidate number first.
 */
internal sealed class QuoteNumberGenerator
{
    // A unique index on Quote.QuoteNumber is the source of truth: the
    // sequence lookup in BuildCandidateNumberAsync only reduces collisions,
    // it cannot prevent a genuine race between two concurrent inserts that
    // compute the same next sequence value at the same time. Five attempts
    // absorbs that race without silently retrying forever if the repeated
    // failure is actually something else.
    private const int MaxAttempts = 5;

    private readonly AutoServiceDbContext _dbContext;

    internal QuoteNumberGenerator(AutoServiceDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /**
     * Assigns a freshly generated quote number to the given quote, adds it
     * to the context, and saves it. Retries with a new candidate number, up
     * to MaxAttempts times, if a concurrent insert already claimed the
     * previous candidate.
     *
     * @param quote The quote to persist; its QuoteNumber is overwritten by this method.
     * @param cancellationToken Cancellation token for the async database operations.
     * @return The same quote instance, with QuoteNumber assigned and persisted.
     */
    internal async Task<Quote> CreateAsync(Quote quote, CancellationToken cancellationToken)
    {
        _dbContext.Quotes.Add(quote);

        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            quote.QuoteNumber = await BuildCandidateNumberAsync(cancellationToken);

            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
                return quote;
            }
            catch (DbUpdateException ex) when (UniqueConstraintDetection.IsUniqueConstraintViolation(ex) && attempt < MaxAttempts)
            {
                // Another concurrent insert claimed this candidate number
                // first; loop again and compute a fresh one. The quote
                // entity stays tracked as Added, so the next SaveChangesAsync
                // call re-attempts the insert with the new QuoteNumber.
            }
        }

        // Unreachable: the loop above always either returns on success or
        // rethrows the DbUpdateException once attempt reaches MaxAttempts
        // (the exception filter above stops catching at that point). This
        // satisfies the compiler's need for a return on every code path.
        throw new InvalidOperationException($"Failed to generate a unique quote number after {MaxAttempts} attempts.");
    }

    /**
     * Computes the next sequence number for the current UTC year and
     * formats it as ARSM-{yyyy}-{0000}. The sequence restarts every year.
     *
     * @param cancellationToken Cancellation token for the async database query.
     * @return The candidate quote number.
     */
    private async Task<string> BuildCandidateNumberAsync(CancellationToken cancellationToken)
    {
        var yearPrefix = $"ARSM-{DateTime.UtcNow.Year}-";

        // Zero-padded to 4 digits, so lexicographic order equals numeric
        // order: ordering by QuoteNumber descending and taking the first
        // row is the same answer as loading every number and taking the
        // max in C#, in a single row instead of the whole year. The unique
        // index on QuoteNumber remains the real source of truth against
        // races; this only reduces how often two concurrent inserts collide.
        var highestQuoteNumber = await _dbContext.Quotes
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
