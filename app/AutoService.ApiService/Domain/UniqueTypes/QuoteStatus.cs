namespace AutoService.ApiService.Domain.UniqueTypes;

/** Lifecycle status of a Quote (D7); Expired is a computed DTO flag (Status == Sent && ValidUntil < now), never stored (CLAUDE.md Quote Anchors). */
public enum QuoteStatus
{
    Draft,
    Sent,
    Accepted,
    Rejected
}
