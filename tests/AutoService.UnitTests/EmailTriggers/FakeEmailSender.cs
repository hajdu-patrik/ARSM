using AutoService.ApiService.Email;

namespace AutoService.UnitTests.EmailTriggers;

/** Records every message and answers a configured result, or throws when told to. */
internal sealed class FakeEmailSender : IEmailSender
{
    public List<EmailMessage> Sent { get; } = [];

    public EmailSendResult Result { get; set; } = EmailSendResult.Success("id-1", 200);

    public Exception? ThrowOnSend { get; set; }

    public Task<EmailSendResult> SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        Sent.Add(message);
        if (ThrowOnSend is not null)
        {
            throw ThrowOnSend;
        }

        return Task.FromResult(Result);
    }
}
