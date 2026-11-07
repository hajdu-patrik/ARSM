using Azure;
using Azure.Communication.Email;
using AcsAttachment = Azure.Communication.Email.EmailAttachment;
using AcsMessage = Azure.Communication.Email.EmailMessage;

namespace AutoService.ApiService.Email.Sending;

/** Sends one mail through Azure Communication Services; no retry loop, the result only says whether a retry could help. */
public sealed class AzureCommunicationEmailSender(
    EmailClient client,
    EmailSettings settings,
    ILogger<AzureCommunicationEmailSender> logger) : IEmailSender
{
    public async Task<EmailSendResult> SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        var recipient = message.To.Trim();
        if (!EmailHeaderSanitizer.IsSingleAddress(recipient))
        {
            return LocalRefusal("recipient is not a single plain e-mail address");
        }

        var subject = EmailHeaderSanitizer.SanitizeSubject(message.Subject);
        if (subject.Length == 0)
        {
            return LocalRefusal("empty subject");
        }

        var domain = recipient[(recipient.LastIndexOf('@') + 1)..];
        if (ReservedMailDomains.IsReserved(domain))
        {
            // A bounce from a test address would count against the sender reputation of the real domain.
            logger.LogInformation("E-mail not sent: {RecipientDomain} is a reserved domain that cannot receive mail", domain);
            return EmailSendResult.SkippedNoOp();
        }

        try
        {
            // Started returns once the service accepted the message, like the provider acceptance before.
            var operation = await client.SendAsync(WaitUntil.Started, BuildMessage(message, recipient, subject), cancellationToken);
            logger.LogInformation("Communication Services accepted a mail for a {RecipientDomain} recipient", domain);
            return EmailSendResult.Success(operation.Id, 202);
        }
        catch (RequestFailedException exception)
        {
            var retryable = exception.Status is 0 or 429 or >= 500;
            logger.LogWarning(
                "Communication Services refused a mail for a {RecipientDomain} recipient: status {Status}, error {ErrorCode}",
                domain, exception.Status, exception.ErrorCode);
            return EmailSendResult.Failure(
                exception.Status == 0 ? null : exception.Status,
                $"Communication Services {exception.Status} {exception.ErrorCode}".TrimEnd(),
                retryable);
        }
    }

    private AcsMessage BuildMessage(EmailMessage message, string recipient, string subject)
    {
        var content = new EmailContent(subject) { Html = message.Html, PlainText = message.Text };
        var mail = new AcsMessage(settings.From, new EmailRecipients([new EmailAddress(recipient)]), content);
        mail.ReplyTo.Add(new EmailAddress(settings.ReplyTo));
        foreach (var attachment in message.Attachments)
        {
            mail.Attachments.Add(new AcsAttachment(attachment.FileName, attachment.ContentType, BinaryData.FromBytes(attachment.Content))
            {
                ContentId = attachment.ContentId,
            });
        }

        return mail;
    }

    /** A permanent, local refusal: no request is made, because a retry would fail the same way. */
    private static EmailSendResult LocalRefusal(string reason) =>
        EmailSendResult.Failure(null, $"not sent: {reason}", retryable: false);
}
