using AutoService.ApiService.Email.Templates;
using AutoService.ApiService.Quotes.Pdf;

namespace AutoService.UnitTests.Email;

/** The three mail builders keep the contract: recipient, subject, attachments and the key facts in both bodies. */
public sealed class EmailBuildersTests
{
    private const string LoginUrl = "https://arsm.hu/login";

    private static readonly EmailFooter Footer =
        new("ARSM Kft.", "1111 Budapest, Fo utca 1.", "+36 1 111 1111", "info@arsm.hu");

    private static readonly byte[] Pdf = [0x25, 0x50, 0x44, 0x46];

    private static QuoteSentEmailModel QuoteModel(string title = "<b>Oil</b> & brakes") => new(
        "customer@example.com",
        "Kiss Janos",
        "Q-2026-0001",
        title,
        "ABC-123 - Opel Astra",
        125000m,
        new DateTime(2026, 11, 30));

    [Fact]
    public void QuoteSent_addresses_the_customer_and_names_the_quote_in_the_subject()
    {
        var message = QuoteSentEmail.Build(QuoteModel(), Footer, Pdf, "quote.pdf");

        Assert.Equal("customer@example.com", message.To);
        Assert.Equal("Árajánlat Q-2026-0001 - ARSM Kft. | Quote Q-2026-0001", message.Subject);
    }

    [Fact]
    public void QuoteSent_attaches_the_logo_first_and_the_pdf_second()
    {
        var message = QuoteSentEmail.Build(QuoteModel(), Footer, Pdf, "quote-Q-2026-0001.pdf");

        Assert.Equal(2, message.Attachments.Count);
        Assert.Equal(EmailLayout.LogoContentId, message.Attachments[0].ContentId);
        Assert.Equal("image/png", message.Attachments[0].ContentType);
        Assert.Equal("quote-Q-2026-0001.pdf", message.Attachments[1].FileName);
        Assert.Equal("application/pdf", message.Attachments[1].ContentType);
        Assert.Null(message.Attachments[1].ContentId);
        Assert.Equal(Pdf, message.Attachments[1].Content);
    }

    [Fact]
    public void QuoteSent_body_mentions_the_vehicle_and_escapes_the_title()
    {
        var message = QuoteSentEmail.Build(QuoteModel(), Footer, Pdf, "quote.pdf");

        Assert.Contains("ABC-123 - Opel Astra", message.Html);
        Assert.Contains("&lt;b&gt;Oil&lt;/b&gt; &amp; brakes", message.Html);
        Assert.DoesNotContain("<b>Oil</b>", message.Html);
        Assert.Contains("ABC-123 - Opel Astra", message.Text);
        Assert.Contains("<b>Oil</b> & brakes", message.Text);
    }

    [Fact]
    public void QuoteSent_text_carries_the_formatted_total_and_validity_in_hungarian_first()
    {
        var message = QuoteSentEmail.Build(QuoteModel(), Footer, Pdf, "quote.pdf");

        var total = QuoteDocumentFormatting.FormatAmount(125000m);
        Assert.Contains(total, message.Text);
        Assert.Contains(QuoteDocumentFormatting.FormatDate(new DateTime(2026, 11, 30)), message.Text);
        Assert.True(message.Text.IndexOf("Tisztelt", StringComparison.Ordinal) < message.Text.IndexOf("Dear", StringComparison.Ordinal));
    }

    [Fact]
    public void TemporaryPassword_carries_the_password_and_login_url_in_html_and_text()
    {
        var model = new TemporaryPasswordEmailModel("mech@example.com", "Nagy Peter", "Tmp-Pass-9x", LoginUrl);

        var message = TemporaryPasswordEmail.Build(model, Footer);

        Assert.Equal("mech@example.com", message.To);
        Assert.Equal("Ideiglenes jelszó - ARSM | Temporary password", message.Subject);
        Assert.Contains("Tmp-Pass-9x", message.Html);
        Assert.Contains("Tmp-Pass-9x", message.Text);
        Assert.Contains(LoginUrl, message.Html);
        Assert.Contains(LoginUrl, message.Text);
        Assert.Single(message.Attachments);
        Assert.Equal(EmailLayout.LogoContentId, message.Attachments[0].ContentId);
    }

    [Fact]
    public void TemporaryPassword_escapes_the_password_in_html_only()
    {
        var model = new TemporaryPasswordEmailModel("mech@example.com", "Nagy Peter", "a<b>&c", LoginUrl);

        var message = TemporaryPasswordEmail.Build(model, Footer);

        Assert.Contains("a&lt;b&gt;&amp;c", message.Html);
        Assert.DoesNotContain("a<b>&c", message.Html);
        Assert.Contains("a<b>&c", message.Text);
    }

    [Fact]
    public void Welcome_carries_the_login_url_and_the_logo()
    {
        var model = new WelcomeEmailModel("mech@example.com", "Nagy Peter", LoginUrl);

        var message = WelcomeEmail.Build(model, Footer);

        Assert.Equal("mech@example.com", message.To);
        Assert.Equal("Üdvözöljük az ARSM-ben | Welcome to ARSM", message.Subject);
        Assert.Contains(LoginUrl, message.Html);
        Assert.Contains(LoginUrl, message.Text);
        Assert.Single(message.Attachments);
        Assert.Equal(EmailLayout.LogoContentId, message.Attachments[0].ContentId);
    }
}
