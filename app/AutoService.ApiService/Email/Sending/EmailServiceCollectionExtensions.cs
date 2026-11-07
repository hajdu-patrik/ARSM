using Azure.Communication.Email;
using Azure.Core;
using Azure.Identity;

namespace AutoService.ApiService.Email.Sending;

/** Registers the e-mail settings and the sender. */
public static class EmailServiceCollectionExtensions
{
    public const int SendTimeoutSeconds = 15;

    // Strategy via IEmailSender: the no-op or the Communication Services sender is chosen once, at composition.
    public static IServiceCollection AddArsmEmail(this IServiceCollection services, IConfiguration configuration)
    {
        var settings = EmailSettingsResolver.Resolve(configuration);
        services.AddSingleton(settings);

        if (settings.IsConfigured)
        {
            services.AddSingleton(_ => CreateClient(settings));
            services.AddSingleton<IEmailSender, AzureCommunicationEmailSender>();
        }
        else
        {
            services.AddSingleton<IEmailSender, LoggingNoOpEmailSender>();
        }

        return services;
    }

    /** A send is not idempotent, so the client makes exactly one attempt within the timeout. */
    internal static EmailClientOptions CreateOptions()
    {
        var options = new EmailClientOptions();
        options.Retry.MaxRetries = 0;
        options.Retry.Mode = RetryMode.Fixed;
        options.Retry.NetworkTimeout = TimeSpan.FromSeconds(SendTimeoutSeconds);
        return options;
    }

    private static EmailClient CreateClient(EmailSettings settings) =>
        new(
            new Uri(settings.Endpoint!),
            new ManagedIdentityCredential(ManagedIdentityId.FromUserAssignedClientId(settings.ManagedIdentityClientId!)),
            CreateOptions());
}
