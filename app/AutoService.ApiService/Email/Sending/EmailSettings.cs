namespace AutoService.ApiService.Email.Sending;

/** E-mail settings from the Email section; a blank Endpoint selects the logging no-op sender. */
public sealed record EmailSettings(
    string? Endpoint,
    string? ManagedIdentityClientId,
    string From,
    string ReplyTo,
    string PublicUrl)
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(Endpoint);
}
