namespace AutoService.ApiService.Email.Templates;

/** Recipient and login link of the welcome mail. */
internal sealed record WelcomeEmailModel(string To, string MechanicName, string LoginUrl);

/** Builds the welcome mail sent after a mechanic registers. */
internal static class WelcomeEmail
{
    internal static EmailMessage Build(WelcomeEmailModel model, EmailFooter footer)
    {
        var hungarian = new EmailBody()
            .Paragraph($"Kedves {model.MechanicName}!")
            .Paragraph("Üdvözöljük az ARSM-ben, a fiókja elkészült.")
            .Link("Bejelentkezés:", model.LoginUrl);

        var english = new EmailBody()
            .Paragraph($"Dear {model.MechanicName},")
            .Paragraph("Welcome to ARSM, your account is ready.")
            .Link("Sign in:", model.LoginUrl);

        var (html, text) = EmailLayout.Render(new EmailLayoutContent(
            "Üdvözöljük az ARSM-ben", hungarian.Html, english.Html, hungarian.Text, english.Text, footer));

        return new EmailMessage(
            model.To,
            "Üdvözöljük az ARSM-ben | Welcome to ARSM",
            html,
            text,
            [EmailLayout.LogoAttachment()]);
    }
}
