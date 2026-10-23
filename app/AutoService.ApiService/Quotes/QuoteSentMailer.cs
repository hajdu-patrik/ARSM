using AutoService.ApiService.Configuration;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Email;
using AutoService.ApiService.Email.Sending;
using AutoService.ApiService.Email.Templates;

namespace AutoService.ApiService.Quotes;

/** Builds and sends the quote mail; a failure is logged (status and message only) and returned, never thrown. */
internal sealed class QuoteSentMailer(IEmailSender sender, EmailSettings settings, ILogger logger)
{
    internal async Task<EmailSendResult> SendAsync(
        Quote quote,
        CompanyProfile company,
        byte[] pdf,
        CancellationToken cancellationToken)
    {
        var vehicle = quote.Vehicle;
        var model = new QuoteSentEmailModel(
            vehicle.Customer.Email,
            vehicle.Customer.Name.ToString(),
            quote.QuoteNumber,
            quote.Title,
            $"{vehicle.LicensePlate} - {vehicle.Brand} {vehicle.Model}",
            quote.TotalGross,
            quote.ValidUntil);
        var footer = EmailFooter.From(company, settings.ReplyTo);
        var message = QuoteSentEmail.Build(model, footer, pdf, $"{quote.QuoteNumber}.pdf");

        var result = await sender.SendAsync(message, cancellationToken);
        if (!result.Sent)
        {
            logger.LogWarning(
                "Quote e-mail was not sent (status {StatusCode}): {Message}",
                result.StatusCode,
                result.Message);
        }

        return result;
    }
}
