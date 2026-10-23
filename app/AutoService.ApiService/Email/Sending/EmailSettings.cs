namespace AutoService.ApiService.Email.Sending;

/** E-mail settings from the Email section; a blank ResendApiKey selects the logging no-op sender. */
public sealed record EmailSettings(string? ResendApiKey, string From, string ReplyTo, string PublicUrl)
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(ResendApiKey);
}
