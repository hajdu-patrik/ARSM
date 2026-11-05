namespace AutoService.ApiService.Quotes;

/** Pure rule for the quote mail recipient: a blank address and a `.local` domain (the synthetic
 * mechanic-owner address included) cannot receive mail, so they are never sent to (K10). */
internal static class QuoteRecipientRules
{
    private const string UndeliverableDomainSuffix = ".local";

    internal static bool HasDeliverableAddress(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

        var address = email.Trim();
        var domain = address[(address.LastIndexOf('@') + 1)..];
        return !domain.EndsWith(UndeliverableDomainSuffix, StringComparison.OrdinalIgnoreCase);
    }
}
