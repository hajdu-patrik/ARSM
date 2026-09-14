namespace AutoService.ApiService.Domain.UniqueTypes;

/**
 * Lifecycle status of a Quote (D7). Expired is a computed DTO-level flag,
 * not a stored status: Status == Sent && ValidUntil < now, decided in the
 * DTO mapper, never persisted as its own value.
 */
public enum QuoteStatus
{
    Draft,
    Sent,
    Accepted,
    Rejected
}
