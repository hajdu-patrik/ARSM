namespace AutoService.ApiService.Email.Templates;

/** Recipient, temporary password and login link of the reset mail. */
internal sealed record TemporaryPasswordEmailModel(string To, string MechanicName, string TemporaryPassword, string LoginUrl);

/** Builds the mail that hands over an admin-set temporary password. */
internal static class TemporaryPasswordEmail
{
    internal static EmailMessage Build(TemporaryPasswordEmailModel model, EmailFooter footer)
    {
        var hungarian = new EmailBody()
            .Paragraph($"Kedves {model.MechanicName}!")
            .Paragraph("Az adminisztrátor ideiglenes jelszót állított be a fiókjához.")
            .Code("Ideiglenes jelszó:", model.TemporaryPassword)
            .Link("Bejelentkezés:", model.LoginUrl)
            .Paragraph("Az első bejelentkezéskor a rendszer új jelszó megadását kéri.");

        var english = new EmailBody()
            .Paragraph($"Dear {model.MechanicName},")
            .Paragraph("An administrator has set a temporary password for your account; it is shown above.")
            .Paragraph("Your first login will force you to choose a new password.");

        var (html, text) = EmailLayout.Render(new EmailLayoutContent(
            "Ideiglenes jelszó", hungarian.Html, english.Html, hungarian.Text, english.Text, footer));

        return new EmailMessage(
            model.To,
            "Ideiglenes jelszó - ARSM | Temporary password",
            html,
            text,
            [EmailLayout.LogoAttachment()]);
    }
}
