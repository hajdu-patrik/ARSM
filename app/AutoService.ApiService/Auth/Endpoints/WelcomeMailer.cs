using AutoService.ApiService.Configuration;
using AutoService.ApiService.Email;
using AutoService.ApiService.Email.Sending;
using AutoService.ApiService.Email.Templates;

namespace AutoService.ApiService.Auth.Endpoints;

/** Sends the welcome mail to a freshly registered mechanic; never throws. */
internal sealed class WelcomeMailer(IEmailSender sender, EmailSettings settings, ILogger logger)
{
    public async Task<bool> SendAsync(string email, string mechanicName, CompanyProfile company, CancellationToken cancellationToken)
    {
        try
        {
            var model = new WelcomeEmailModel(email, mechanicName, settings.PublicUrl.TrimEnd('/') + "/login");
            var message = WelcomeEmail.Build(model, EmailFooter.From(company, settings.ReplyTo));
            var result = await sender.SendAsync(message, cancellationToken);

            if (!result.Sent)
            {
                logger.LogWarning("Welcome e-mail was not sent. Status: {StatusCode}, Retryable: {Retryable}, Reason: {Reason}.", result.StatusCode, result.Retryable, result.Message);
            }

            return result.Sent;
        }
        catch (Exception exception)
        {
            logger.LogWarning("Welcome e-mail failed with {ExceptionType}.", exception.GetType().Name);
            return false;
        }
    }
}
