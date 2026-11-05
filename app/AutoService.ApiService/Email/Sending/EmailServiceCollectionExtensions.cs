namespace AutoService.ApiService.Email.Sending;

/** Registers the e-mail settings and the sender. */
public static class EmailServiceCollectionExtensions
{
    public const int ResendTimeoutSeconds = 15;

    // Strategy via IEmailSender: the no-op or the Resend sender is chosen once, at composition.
    public static IServiceCollection AddArsmEmail(this IServiceCollection services, IConfiguration configuration)
    {
        var settings = EmailSettingsResolver.Resolve(configuration);
        services.AddSingleton(settings);

        if (settings.IsConfigured)
        {
            // A Resend POST is not idempotent: no retry, so this client alone drops the resilience pipeline.
#pragma warning disable EXTEXP0001 // RemoveAllResilienceHandlers is still marked experimental in Http.Resilience.
            services
                .AddHttpClient<IEmailSender, ResendEmailSender>()
                .RemoveAllResilienceHandlers()
                .ConfigureHttpClient(client => client.Timeout = TimeSpan.FromSeconds(ResendTimeoutSeconds));
#pragma warning restore EXTEXP0001
        }
        else
        {
            services.AddSingleton<IEmailSender, LoggingNoOpEmailSender>();
        }

        return services;
    }
}
