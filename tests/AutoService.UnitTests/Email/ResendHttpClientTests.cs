using System.Net;
using System.Text;
using AutoService.ApiService.Email;
using AutoService.ApiService.Email.Sending;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Http.Resilience;

namespace AutoService.UnitTests.Email;

/** The Resend POST is a single attempt: a 503 and a slow answer reach the primary handler once, other clients still retry. */
public sealed class ResendHttpClientTests
{
    private const string OtherClientName = "unrelated";

    private static readonly EmailMessage Message = new("customer@example.com", "Subject", "<p>x</p>", "x", []);

    /** Counts the requests that reach the primary handler and answers after the given delay. */
    private sealed class CountingHandler(HttpStatusCode status, TimeSpan delay) : HttpMessageHandler
    {
        private int calls;

        public int Calls => Volatile.Read(ref calls);

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Interlocked.Increment(ref calls);
            await Task.Delay(delay, cancellationToken);
            return new HttpResponseMessage(status) { Content = new StringContent("{\"id\":\"abc\"}", Encoding.UTF8, "application/json") };
        }
    }

    /** The ServiceDefaults client default (standard resilience handler) with short timings, so a retry shows up fast. */
    private static void FastStandardResilience(HttpStandardResilienceOptions options)
    {
        options.AttemptTimeout.Timeout = TimeSpan.FromMilliseconds(250);
        options.Retry.Delay = TimeSpan.FromMilliseconds(1);
    }

    private static ServiceProvider BuildProvider(CountingHandler primary)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Email:ResendApiKey"] = "re_real",
                ["Email:From"] = "ARSM <info@arsm.hu>",
                ["Email:ReplyTo"] = "info@arsm.hu",
                ["Email:PublicUrl"] = "https://arsm.hu",
            })
            .Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.ConfigureHttpClientDefaults(builder => builder.AddStandardResilienceHandler(FastStandardResilience));
        services.AddHttpClient(OtherClientName);
        services.AddArsmEmail(configuration);
        foreach (var clientName in new[] { nameof(IEmailSender), OtherClientName })
        {
            services.Configure<HttpClientFactoryOptions>(
                clientName, options => options.HttpMessageHandlerBuilderActions.Add(builder => builder.PrimaryHandler = primary));
        }

        return services.BuildServiceProvider();
    }

    [Fact]
    public async Task A_503_answer_reaches_the_primary_handler_once()
    {
        var primary = new CountingHandler(HttpStatusCode.ServiceUnavailable, TimeSpan.Zero);
        using var provider = BuildProvider(primary);

        var result = await provider.GetRequiredService<IEmailSender>().SendAsync(Message, CancellationToken.None);

        Assert.Equal(1, primary.Calls);
        Assert.False(result.Sent);
        Assert.Equal(503, result.StatusCode);
    }

    [Fact]
    public async Task A_slow_answer_is_waited_for_in_a_single_attempt()
    {
        var primary = new CountingHandler(HttpStatusCode.OK, TimeSpan.FromMilliseconds(700));
        using var provider = BuildProvider(primary);

        var result = await provider.GetRequiredService<IEmailSender>().SendAsync(Message, CancellationToken.None);

        Assert.Equal(1, primary.Calls);
        Assert.True(result.Sent);
    }

    [Fact]
    public async Task An_unrelated_client_still_retries_a_503_with_the_default_pipeline()
    {
        var primary = new CountingHandler(HttpStatusCode.ServiceUnavailable, TimeSpan.Zero);
        using var provider = BuildProvider(primary);
        using var client = provider.GetRequiredService<IHttpClientFactory>().CreateClient(OtherClientName);

        using var response = await client.PostAsync("https://api.example.test/emails", new StringContent("{}"));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.True(primary.Calls > 1, "the default resilience handler retries a 503");
    }
}
