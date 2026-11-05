namespace AutoService.ApiService.Email;

/** Outcome of one send attempt with the provider status and a retry hint; Skipped marks a no-op "sent". */
public sealed record EmailSendResult(
    bool Sent,
    int? StatusCode,
    string? ProviderMessageId,
    string? Message,
    bool Retryable,
    bool Skipped = false)
{
    public static EmailSendResult Success(string id, int status) => new(true, status, id, null, false);

    /** The no-op sender's outcome: counts as Sent for the quote flow, but nothing left the server. */
    public static EmailSendResult SkippedNoOp() => new(true, 200, "noop", null, false, Skipped: true);

    public static EmailSendResult Failure(int? status, string message, bool retryable) =>
        new(false, status, null, message, retryable);
}
