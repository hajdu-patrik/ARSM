using System.Collections.Concurrent;
using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Realtime;

namespace AutoService.ApiService.Security;

/** Per-person "tokens issued before X are invalid" cutoffs, so a deletion, lockout or password change
    does not leave a 10-minute access token alive; process-local like the rate limits (single instance). */
internal interface ISessionRevocationService
{
    /** Invalidates every access token the person holds right now and closes their live streams. */
    void RevokeAll(int personId);

    /** True when a token of the person was issued before the person's cutoff. */
    bool IsRevoked(int personId, DateTimeOffset issuedAt);

    /** The issue time of a new token of the person: now, or the person's cutoff when that is later. */
    DateTime IssueTimeUtc(int personId, DateTime nowUtc);
}

internal sealed class SessionRevocationService(IEnumerable<IUserSubscriptions> subscriptions) : ISessionRevocationService
{
    // Cutoffs are whole seconds like the JWT iat claim and climb with every revocation, so a token issued
    // before it in the same second is gone while the next token (dated at the cutoff by IssueTimeUtc) stays.
    private readonly ConcurrentDictionary<int, long> cutoffUnixSeconds = new();

    public void RevokeAll(int personId)
    {
        var nowUnixSeconds = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        cutoffUnixSeconds.AddOrUpdate(personId, nowUnixSeconds + 1, (_, cutoff) => Math.Max(cutoff, nowUnixSeconds) + 1);

        foreach (var channel in subscriptions)
        {
            channel.DisconnectUser(personId);
        }

        PruneExpired(nowUnixSeconds);
    }

    public bool IsRevoked(int personId, DateTimeOffset issuedAt)
        => cutoffUnixSeconds.TryGetValue(personId, out var cutoff) && issuedAt.ToUnixTimeSeconds() < cutoff;

    public DateTime IssueTimeUtc(int personId, DateTime nowUtc)
        => cutoffUnixSeconds.TryGetValue(personId, out var cutoff) && new DateTimeOffset(nowUtc).ToUnixTimeSeconds() < cutoff
            ? DateTimeOffset.FromUnixTimeSeconds(cutoff).UtcDateTime
            : nowUtc;

    /** A cutoff older than the longest-living token plus the clock skew can never match a token again. */
    private void PruneExpired(long nowUnixSeconds)
    {
        var retention = (long)(AuthEndpoints.AccessTokenTtl + AuthEndpoints.ClockSkew).TotalSeconds;

        foreach (var entry in cutoffUnixSeconds)
        {
            if (entry.Value + retention < nowUnixSeconds)
            {
                cutoffUnixSeconds.TryRemove(entry);
            }
        }
    }
}
