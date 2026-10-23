namespace AutoService.ApiService.Email;

// Triggers depend on this interface only, so the Resend client, the no-op sender
// and the test fakes are interchangeable (DIP).
public interface IEmailSender
{
    Task<EmailSendResult> SendAsync(EmailMessage message, CancellationToken cancellationToken);
}
