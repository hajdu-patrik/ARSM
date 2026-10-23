using AutoService.ApiService.Configuration;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Email;
using AutoService.ApiService.Email.Sending;
using AutoService.ApiService.Quotes;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoService.UnitTests.EmailTriggers;

/** The quote mailer addresses the customer, attaches logo and PDF, and returns the sender result as-is. */
public sealed class QuoteSentMailerTests
{
    private static readonly EmailSettings Settings =
        new("re_test", "ARSM <info@example.test>", "info@example.test", "https://example.test");

    private static readonly CompanyProfile Company =
        new("Test Kft.", "Fo utca 1.", "1111", "Budapest", "11111111-1-11", "+36 1 111 1111", "info@example.test");

    private static Quote BuildQuote()
    {
        var customer = new Customer(new FullName("Anna", null, "Kovacs"), "anna@example.test", null);
        var vehicle = new Vehicle("ABC-123", "VIN00000000000001", "Skoda", "Octavia", 2018, 100000, 85, DrivetrainType.Petrol)
        {
            Customer = customer
        };
        return new Quote("Service", null, new DateTime(2026, 12, 31), 1, null, null)
        {
            QuoteNumber = "ARSM-2026-0001",
            TotalGross = 12700m,
            Vehicle = vehicle
        };
    }

    private static QuoteSentMailer Create(FakeEmailSender sender) =>
        new(sender, Settings, NullLogger.Instance);

    [Fact]
    public async Task SendAsync_addresses_the_customer_and_puts_the_quote_number_in_the_subject()
    {
        var sender = new FakeEmailSender();

        await Create(sender).SendAsync(BuildQuote(), Company, [1, 2, 3], CancellationToken.None);

        var message = Assert.Single(sender.Sent);
        Assert.Equal("anna@example.test", message.To);
        Assert.Contains("ARSM-2026-0001", message.Subject);
    }

    [Fact]
    public async Task SendAsync_attaches_the_logo_first_and_the_named_pdf_second()
    {
        var sender = new FakeEmailSender();
        byte[] pdf = [1, 2, 3];

        await Create(sender).SendAsync(BuildQuote(), Company, pdf, CancellationToken.None);

        var attachments = Assert.Single(sender.Sent).Attachments;
        Assert.Equal(2, attachments.Count);
        Assert.NotNull(attachments[0].ContentId);
        Assert.Equal("image/png", attachments[0].ContentType);
        Assert.Equal("ARSM-2026-0001.pdf", attachments[1].FileName);
        Assert.Equal("application/pdf", attachments[1].ContentType);
        Assert.Null(attachments[1].ContentId);
        Assert.Equal(pdf, attachments[1].Content);
    }

    [Fact]
    public async Task SendAsync_returns_the_success_result_as_is()
    {
        var sender = new FakeEmailSender();

        var result = await Create(sender).SendAsync(BuildQuote(), Company, [1], CancellationToken.None);

        Assert.True(result.Sent);
        Assert.Equal("id-1", result.ProviderMessageId);
    }

    [Fact]
    public async Task SendAsync_returns_a_failing_result_as_is()
    {
        var failure = EmailSendResult.Failure(422, "bad address", false);
        var sender = new FakeEmailSender { Result = failure };

        var result = await Create(sender).SendAsync(BuildQuote(), Company, [1], CancellationToken.None);

        Assert.False(result.Sent);
        Assert.Equal(failure, result);
    }
}
