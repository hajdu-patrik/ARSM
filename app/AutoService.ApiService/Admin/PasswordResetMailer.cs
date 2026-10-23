using AutoService.ApiService.Configuration;
using AutoService.ApiService.Email;
using AutoService.ApiService.Email.Sending;
using AutoService.ApiService.Email.Templates;

namespace AutoService.ApiService.Admin;

/** Mails the admin-set temporary password to the mechanic; a failure is logged and never thrown. */
internal sealed class PasswordResetMailer(IEmailSender sender, EmailSettings settings, ILogger logger)
{
    /** Builds and sends the mail; true only when the sender reports it went out. */
    internal async Task<bool> SendAsync(
        string email,
        string mechanicName,
        string temporaryPassword,
        CompanyProfile company,
        CancellationToken cancellationToken)
    {
        try
        {
            var model = new TemporaryPasswordEmailModel(
                email, mechanicName, temporaryPassword, settings.PublicUrl.TrimEnd('/') + "/login");
            var message = TemporaryPasswordEmail.Build(model, EmailFooter.From(company, settings.ReplyTo));
            var result = await sender.SendAsync(message, cancellationToken);
            if (!result.Sent)
            {
                logger.LogWarning(
                    "Temporary password e-mail was not sent: status {StatusCode}, {Message}.", result.StatusCode, result.Message);
            }

            return result.Sent;
        }
        catch (Exception ex)
        {
            logger.LogWarning("Temporary password e-mail failed: {ExceptionType}.", ex.GetType().Name);
            return false;
        }
    }
}
