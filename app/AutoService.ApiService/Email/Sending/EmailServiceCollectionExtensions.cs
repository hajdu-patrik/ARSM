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
            services
                .AddHttpClient<IEmailSender, ResendEmailSender>()
                .ConfigureHttpClient(client => client.Timeout = TimeSpan.FromSeconds(ResendTimeoutSeconds));
        }
        else
        {
            services.AddSingleton<IEmailSender, LoggingNoOpEmailSender>();
        }

        return services;
    }
}
