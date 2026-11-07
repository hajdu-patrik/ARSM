using AutoService.ApiService.Email;
using AutoService.ApiService.Email.Sending;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoService.UnitTests.Email;

/** The no-op sender answers Sent, and the composition picks it only without a mail endpoint. */
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
        Assert.True(result.Skipped);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task AddArsmEmail_without_an_endpoint_resolves_the_noop_sender(string? endpoint)
    {
        var provider = BuildProvider(new Dictionary<string, string?> { ["Email:Endpoint"] = endpoint });

        var sender = provider.GetRequiredService<IEmailSender>();
        var result = await sender.SendAsync(Message, CancellationToken.None);

        Assert.IsType<LoggingNoOpEmailSender>(sender);
        Assert.False(provider.GetRequiredService<EmailSettings>().IsConfigured);
        Assert.True(result.Sent);
    }

    [Fact]
    public void AddArsmEmail_with_an_endpoint_resolves_the_communication_services_sender()
    {
        var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["Email:Endpoint"] = "https://arsm-mail.europe.communication.azure.com",
            ["Email:ManagedIdentityClientId"] = "11111111-2222-3333-4444-555555555555",
            ["Email:From"] = "info@arsm.hu",
            ["Email:ReplyTo"] = "info@arsm.hu",
            ["Email:PublicUrl"] = "https://arsm.hu",
        });

        Assert.IsType<AzureCommunicationEmailSender>(provider.GetRequiredService<IEmailSender>());
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
