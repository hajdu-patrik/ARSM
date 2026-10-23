using AutoService.ApiService.Data;
using AutoService.ApiService.Email;
using AutoService.ApiService.Email.Sending;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Auth.Endpoints;

/** Runs the welcome mail detached in its own DI scope, so a mail failure never changes the registration outcome. */
internal static class WelcomeMailDispatcher
{
    internal static void Dispatch(IServiceScopeFactory scopeFactory, ILogger logger, string email, string mechanicName)
    {
        _ = Task.Run(() => SendInOwnScopeAsync(scopeFactory, logger, email, mechanicName));
    }

    /** Resolves the mail dependencies from a fresh scope and sends; swallows and logs every failure. */
    private static async Task SendInOwnScopeAsync(IServiceScopeFactory scopeFactory, ILogger logger, string email, string mechanicName)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AutoServiceDbContext>();
            var row = await db.CompanyProfiles.AsNoTracking().FirstOrDefaultAsync(CancellationToken.None);

            if (row is null)
            {
                logger.LogWarning("Welcome e-mail skipped: the company profile row is missing.");
                return;
            }

            var mailer = new WelcomeMailer(
                scope.ServiceProvider.GetRequiredService<IEmailSender>(),
                scope.ServiceProvider.GetRequiredService<EmailSettings>(),
                logger);

            await mailer.SendAsync(email, mechanicName, row.ToProfile(), CancellationToken.None);
        }
        catch (Exception exception)
        {
            logger.LogWarning("Welcome e-mail dispatch failed with {ExceptionType}.", exception.GetType().Name);
        }
    }
}
