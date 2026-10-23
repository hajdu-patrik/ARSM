using AutoService.ApiService.Admin;
using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Configuration;
using AutoService.ApiService.Email;
using AutoService.ApiService.Email.Sending;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoService.UnitTests.EmailTriggers;

/** The reset mailer carries the temporary password and login link; it never throws. */
public sealed class PasswordResetMailerTests
{
    private static readonly EmailSettings Settings =
        new("re_test", "ARSM <info@example.test>", "info@example.test", "https://example.test");

    private static readonly CompanyProfile Company =
        new("Test Kft.", "Fo utca 1.", "1111", "Budapest", "11111111-1-11", "+36 1 111 1111", "info@example.test");

    private static PasswordResetMailer Create(FakeEmailSender sender) => new(sender, Settings, NullLogger.Instance);

    private static Task<bool> Send(PasswordResetMailer mailer) =>
        mailer.SendAsync("mech@example.test", "Bela", "Temp-Pass-123!", Company, CancellationToken.None);

    [Fact]
    public async Task SendAsync_sends_to_the_recipient_with_the_login_url()
    {
        var sender = new FakeEmailSender();

        var sent = await Send(Create(sender));

        Assert.True(sent);
        var message = Assert.Single(sender.Sent);
        Assert.Equal("mech@example.test", message.To);
        Assert.Contains("https://example.test/login", message.Html);
        Assert.Contains("https://example.test/login", message.Text);
        Assert.Contains("Temp-Pass-123!", message.Html);
        Assert.Contains("Temp-Pass-123!", message.Text);
    }

    [Fact]
    public async Task SendAsync_returns_false_when_the_sender_reports_a_failure()
    {
        var sender = new FakeEmailSender { Result = EmailSendResult.Failure(500, "down", true) };

        Assert.False(await Send(Create(sender)));
    }

    [Fact]
    public async Task SendAsync_returns_false_when_the_sender_throws()
    {
        var sender = new FakeEmailSender { ThrowOnSend = new InvalidOperationException("boom") };

        Assert.False(await Send(Create(sender)));
    }
}
