namespace AutoService.ApiService.Email.Sending;

/** Sender used when no Resend key is configured (dev, CI, unit tests); logs the mail and sends nothing. */
public sealed class LoggingNoOpEmailSender(ILogger<LoggingNoOpEmailSender> logger) : IEmailSender
{
    public Task<EmailSendResult> SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        // Recipient, subject and attachment count only: the body may carry a temporary password.
        logger.LogInformation(
            "E-mail not sent (no Resend key configured): to {Recipient}, subject {Subject}, {AttachmentCount} attachment(s)",
            message.To,
            EmailHeaderSanitizer.SanitizeSubject(message.Subject),
            message.Attachments.Count);

        return Task.FromResult(EmailSendResult.Success("noop", 200));
    }
}
