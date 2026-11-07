using Azure;
using Azure.Communication.Email;
using AutoService.ApiService.Email.Sending;
using Microsoft.Extensions.Logging.Abstractions;
using ArsmAttachment = AutoService.ApiService.Email.EmailAttachment;
using ArsmMessage = AutoService.ApiService.Email.EmailMessage;

namespace AutoService.UnitTests.Email;

/** The Communication Services sender maps the message, skips what must not be sent and classifies every failure. */
public sealed class AzureCommunicationEmailSenderTests
{
    private static readonly EmailSettings Settings = new(
        "https://arsm-mail.europe.communication.azure.com",
        "11111111-2222-3333-4444-555555555555",
        "info@arsm.hu",
        "reply@arsm.hu",
        "https://arsm.hu");

    private static readonly ArsmMessage Message = new(
        "customer@arsm.hu",
        "Árajánlat Q-1 | Quote Q-1",
        "<p>Hello</p>",
        "Hello",
        [
            new ArsmAttachment("arsm-logo.png", [1, 2, 3], "image/png", "arsm-logo"),
            new ArsmAttachment("quote.pdf", [0x25, 0x50, 0x44, 0x46], "application/pdf", null),
        ]);

    [Fact]
    public async Task SendAsync_maps_the_message_and_returns_the_operation_id()
    {
        var client = new FakeEmailClient();

        var result = await Sender(client).SendAsync(Message, CancellationToken.None);

        var sent = Assert.Single(client.Sent);
        Assert.Equal(WaitUntil.Started, client.LastWait);
        Assert.Equal("info@arsm.hu", sent.SenderAddress);
        Assert.Equal("customer@arsm.hu", Assert.Single(sent.Recipients.To).Address);
        Assert.Equal("reply@arsm.hu", Assert.Single(sent.ReplyTo).Address);
        Assert.Equal("Árajánlat Q-1 | Quote Q-1", sent.Content.Subject);
        Assert.Equal("<p>Hello</p>", sent.Content.Html);
        Assert.Equal("Hello", sent.Content.PlainText);
        Assert.Collection(
            sent.Attachments,
            logo => Assert.Equal(("arsm-logo.png", "image/png", "arsm-logo"), (logo.Name, logo.ContentType, logo.ContentId)),
            pdf => Assert.Equal(("quote.pdf", "application/pdf", (string?)null), (pdf.Name, pdf.ContentType, pdf.ContentId)));
        Assert.True(result.Sent);
        Assert.False(result.Skipped);
        Assert.Equal("operation-1", result.ProviderMessageId);
    }

    [Fact]
    public async Task SendAsync_strips_header_breaks_from_the_subject()
    {
        var client = new FakeEmailClient();

        await Sender(client).SendAsync(Message with { Subject = "Hi\r\nBcc: evil@example.com" }, CancellationToken.None);

        Assert.Equal("Hi Bcc: evil@example.com", Assert.Single(client.Sent).Content.Subject);
    }

    [Fact]
    public async Task SendAsync_skips_a_reserved_recipient_without_calling_the_service()
    {
        var client = new FakeEmailClient();

        var result = await Sender(client).SendAsync(Message with { To = "mechanic@example.test" }, CancellationToken.None);

        Assert.Empty(client.Sent);
        Assert.True(result.Sent);
        Assert.True(result.Skipped);
    }

    [Theory]
    [InlineData("ARSM <a@arsm.hu>", "recipient")]
    [InlineData("a@arsm.hu, b@arsm.hu", "recipient")]
    public async Task SendAsync_refuses_an_unsafe_recipient_locally(string to, string reason)
    {
        var client = new FakeEmailClient();

        var result = await Sender(client).SendAsync(Message with { To = to }, CancellationToken.None);

        Assert.Empty(client.Sent);
        Assert.False(result.Sent);
        Assert.False(result.Retryable);
        Assert.Contains(reason, result.Message);
    }

    [Theory]
    [InlineData(429, true)]
    [InlineData(503, true)]
    [InlineData(400, false)]
    [InlineData(401, false)]
    public async Task SendAsync_classifies_a_refusal(int status, bool retryable)
    {
        var client = new FakeEmailClient { Failure = new RequestFailedException(status, "refused", "EmailDropped", null) };

        var result = await Sender(client).SendAsync(Message, CancellationToken.None);

        Assert.False(result.Sent);
        Assert.Equal(status, result.StatusCode);
        Assert.Equal(retryable, result.Retryable);
    }

    [Fact]
    public async Task SendAsync_treats_a_network_failure_as_retryable_without_a_status()
    {
        var client = new FakeEmailClient { Failure = new RequestFailedException("connection reset") };

        var result = await Sender(client).SendAsync(Message, CancellationToken.None);

        Assert.False(result.Sent);
        Assert.Null(result.StatusCode);
        Assert.True(result.Retryable);
    }

    [Fact]
    public void CreateOptions_makes_a_single_attempt_within_the_timeout()
    {
        var options = EmailServiceCollectionExtensions.CreateOptions();

        Assert.Equal(0, options.Retry.MaxRetries);
        Assert.Equal(TimeSpan.FromSeconds(EmailServiceCollectionExtensions.SendTimeoutSeconds), options.Retry.NetworkTimeout);
    }

    private static AzureCommunicationEmailSender Sender(EmailClient client) =>
        new(client, Settings, NullLogger<AzureCommunicationEmailSender>.Instance);

    /** Records every message and answers a fixed operation id or the scripted failure. */
    private sealed class FakeEmailClient : EmailClient
    {
        public List<EmailMessage> Sent { get; } = [];

        public WaitUntil? LastWait { get; private set; }

        public RequestFailedException? Failure { get; init; }

        public override Task<EmailSendOperation> SendAsync(WaitUntil wait, EmailMessage message, CancellationToken cancellationToken = default)
        {
            if (Failure is not null)
            {
                throw Failure;
            }

            LastWait = wait;
            Sent.Add(message);
            return Task.FromResult(new EmailSendOperation("operation-1", this));
        }
    }
}
