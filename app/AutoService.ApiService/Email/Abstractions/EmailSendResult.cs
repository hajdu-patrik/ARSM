namespace AutoService.ApiService.Email;

/** Outcome of one send attempt with the provider status and a retry hint. */
public sealed record EmailSendResult(
    bool Sent,
    int? StatusCode,
    string? ProviderMessageId,
    string? Message,
    bool Retryable)
{
    public static EmailSendResult Success(string id, int status) => new(true, status, id, null, false);

    public static EmailSendResult Failure(int? status, string message, bool retryable) =>
        new(false, status, null, message, retryable);
}
