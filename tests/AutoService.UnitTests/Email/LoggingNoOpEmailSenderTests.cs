using AutoService.ApiService.Email;
using AutoService.ApiService.Email.Sending;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoService.UnitTests.Email;

/** The no-op sender answers Sent, and the composition picks it only without a Resend key. */
public sealed class LoggingNoOpEmailSenderTests
{
    private static readonly EmailMessage Message = new(
        "customer@example.com", "Subject", "<p>x</p>", "x", [new EmailAttachment("a.png", [1], "image/png", null)]);

    [Fact]
    public async Task SendAsync_returns_sent_with_the_noop_id()
    {
        var sender = new LoggingNoOpEmailSender(NullLogger<LoggingNoOpEmailSender>.Instance);

        var result = await sender.SendAsync(Message, CancellationToken.None);

        Assert.True(result.Sent);
        Assert.Equal("noop", result.ProviderMessageId);
        Assert.Equal(200, result.StatusCode);
        Assert.False(result.Retryable);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task AddArsmEmail_without_a_key_resolves_the_noop_sender(string? key)
    {
        var provider = BuildProvider(new Dictionary<string, string?> { ["Email:ResendApiKey"] = key });

        var sender = provider.GetRequiredService<IEmailSender>();
        var result = await sender.SendAsync(Message, CancellationToken.None);

        Assert.IsType<LoggingNoOpEmailSender>(sender);
        Assert.False(provider.GetRequiredService<EmailSettings>().IsConfigured);
        Assert.True(result.Sent);
    }

    [Fact]
    public void AddArsmEmail_with_a_key_resolves_the_resend_sender()
    {
        var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["Email:ResendApiKey"] = "re_unit_test_key",
            ["Email:From"] = "ARSM <info@arsm.hu>",
            ["Email:ReplyTo"] = "info@arsm.hu",
            ["Email:PublicUrl"] = "https://arsm.hu",
        });

        Assert.IsType<ResendEmailSender>(provider.GetRequiredService<IEmailSender>());
        Assert.True(provider.GetRequiredService<EmailSettings>().IsConfigured);
    }

    private static ServiceProvider BuildProvider(Dictionary<string, string?> values)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(values).Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddArsmEmail(configuration);
        return services.BuildServiceProvider();
    }
}
