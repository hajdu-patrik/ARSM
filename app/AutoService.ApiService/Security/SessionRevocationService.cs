using System.Collections.Concurrent;
using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Realtime;

namespace AutoService.ApiService.Security;

/** Per-person "tokens issued before X are invalid" cutoffs, so a deletion, password reset or change does not
    leave a 10-minute access token alive; in memory for the fast path, persisted in people.TokensValidAfter. */
internal interface ISessionRevocationService
{
    /** Reserves the next cutoff, stamps it on the person for the token issuer and returns it; memory stays untouched.
        The caller persists it with SaveWithSessionCutoffAsync inside its ExecuteInTransactionAsync unit. */
    DateTime StageCutoff(People person);

    /** After the unit committed: raises the in-memory cutoff, closes the person's live streams and prunes old cutoffs. */
    void ApplyRevocation(int personId, DateTime cutoffUtc);

    /** For a person whose row is deleted (nothing to stamp): invalidates every token in memory and closes the streams. */
    void RevokeAll(int personId);

    /** Loads a persisted cutoff into memory at startup without closing any stream; never lowers a cutoff. */
    void Seed(int personId, DateTime cutoffUtc);

    /** True when a token of the person was issued before the person's cutoff. */
    bool IsRevoked(int personId, DateTimeOffset issuedAt);

    /** The issue time of a new token: now, or the later of the in-memory cutoff and the row's own cutoff when ahead. */
    DateTime IssueTimeUtc(int personId, DateTime nowUtc, DateTime? rowCutoffUtc = null);
}

internal sealed class SessionRevocationService(IEnumerable<IUserSubscriptions> subscriptions) : ISessionRevocationService
{
    // Cutoffs are whole seconds like the JWT iat claim and climb with every revocation, so a token issued
    // before it in the same second is gone while the next token (dated at the cutoff by IssueTimeUtc) stays.
    private readonly ConcurrentDictionary<int, long> cutoffUnixSeconds = new();

    // The highest cutoff handed out per person, staged or applied; a save that failed may leave one unused.
    private readonly ConcurrentDictionary<int, long> reservedUnixSeconds = new();

    public DateTime StageCutoff(People person)
    {
        var persisted = person.TokensValidAfter is { } stored ? ToUnixSeconds(stored) : 0;
        var cutoffUtc = DateTimeOffset.FromUnixTimeSeconds(Reserve(person.Id, persisted)).UtcDateTime;
        person.TokensValidAfter = cutoffUtc;
        return cutoffUtc;
    }

    public void ApplyRevocation(int personId, DateTime cutoffUtc)
    {
        Raise(personId, ToUnixSeconds(cutoffUtc));

        foreach (var channel in subscriptions)
        {
            channel.DisconnectUser(personId);
        }

        PruneExpired(DateTimeOffset.UtcNow.ToUnixTimeSeconds());
    }

    public void RevokeAll(int personId)
        => ApplyRevocation(personId, DateTimeOffset.FromUnixTimeSeconds(Reserve(personId, 0)).UtcDateTime);

    public void Seed(int personId, DateTime cutoffUtc) => Raise(personId, ToUnixSeconds(cutoffUtc));

    public bool IsRevoked(int personId, DateTimeOffset issuedAt)
        => cutoffUnixSeconds.TryGetValue(personId, out var cutoff) && issuedAt.ToUnixTimeSeconds() < cutoff;

    public DateTime IssueTimeUtc(int personId, DateTime nowUtc, DateTime? rowCutoffUtc = null)
    {
        var cutoff = cutoffUnixSeconds.TryGetValue(personId, out var current) ? current : 0;
        if (rowCutoffUtc is { } row)
        {
            cutoff = Math.Max(cutoff, ToUnixSeconds(row));
        }

        return cutoff > 0 && new DateTimeOffset(nowUtc).ToUnixTimeSeconds() < cutoff
            ? DateTimeOffset.FromUnixTimeSeconds(cutoff).UtcDateTime
            : nowUtc;
    }

    /** Atomically hands out the next cutoff, a second above every one staged, applied or persisted before,
        so two revocations staged in the same second before either is applied never share a cutoff. */
    private long Reserve(int personId, long persisted)
    {
        var memory = cutoffUnixSeconds.TryGetValue(personId, out var current) ? current : 0;
        var floor = Math.Max(Math.Max(memory, persisted), DateTimeOffset.UtcNow.ToUnixTimeSeconds());

        return reservedUnixSeconds.AddOrUpdate(personId, floor + 1, (_, reserved) => Math.Max(reserved, floor) + 1);
    }

    private void Raise(int personId, long cutoff)
        => cutoffUnixSeconds.AddOrUpdate(personId, cutoff, (_, existing) => Math.Max(existing, cutoff));

    private static long ToUnixSeconds(DateTime utc)
        => new DateTimeOffset(DateTime.SpecifyKind(utc, DateTimeKind.Utc)).ToUnixTimeSeconds();

    /** A cutoff older than the longest-living token plus the clock skew can never match a token again,
        and a reservation that old is below now, so the next one climbs over it anyway. */
    private void PruneExpired(long nowUnixSeconds)
    {
        var retention = (long)(AuthEndpoints.AccessTokenTtl + AuthEndpoints.ClockSkew).TotalSeconds;
        PruneOlderThan(cutoffUnixSeconds, nowUnixSeconds - retention);
        PruneOlderThan(reservedUnixSeconds, nowUnixSeconds - retention);
    }

    private static void PruneOlderThan(ConcurrentDictionary<int, long> entries, long oldestKeptUnixSeconds)
    {
        foreach (var entry in entries)
        {
            if (entry.Value < oldestKeptUnixSeconds)
            {
                entries.TryRemove(entry);
            }
        }
    }
}
