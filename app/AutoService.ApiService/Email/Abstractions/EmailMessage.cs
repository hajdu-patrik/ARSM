namespace AutoService.ApiService.Email;

/** One outgoing e-mail; from and reply-to come from the settings, never from callers. */
public sealed record EmailMessage(
    string To,
    string Subject,
    string Html,
    string Text,
    IReadOnlyList<EmailAttachment> Attachments);
