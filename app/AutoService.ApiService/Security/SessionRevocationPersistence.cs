using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Security;

/** Persists a staged session cutoff monotonically inside the caller's transaction (ExecuteInTransactionAsync),
    so a concurrent revocation that committed a later cutoff first is never lowered by this one. */
internal static class SessionRevocationPersistence
{
    /** Saves the tracked changes, then raises people.TokensValidAfter to the cutoff only where it is null or lower. */
    internal static async Task SaveWithSessionCutoffAsync(
        this AutoServiceDbContext db, int personId, DateTime cutoffUtc, CancellationToken cancellationToken)
    {
        await db.SaveChangesAsync(cancellationToken);
        await db.People
            .Where(p => p.Id == personId && (p.TokensValidAfter == null || p.TokensValidAfter < cutoffUtc))
            .ExecuteUpdateAsync(setters => setters.SetProperty(p => p.TokensValidAfter, (DateTime?)cutoffUtc), cancellationToken);
    }
}
