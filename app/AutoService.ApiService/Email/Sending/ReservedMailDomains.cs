namespace AutoService.ApiService.Email.Sending;

/** Domains reserved by RFC 2606 and RFC 6761 that can never receive mail (the test fixtures use them). */
internal static class ReservedMailDomains
{
    private static readonly string[] ReservedTopLevelDomains = ["test", "example", "invalid", "localhost"];

    private static readonly string[] ReservedSecondLevelDomains = ["example.com", "example.net", "example.org"];

    internal static bool IsReserved(string domain)
    {
        var normalized = domain.Trim().TrimEnd('.').ToLowerInvariant();
        var topLevel = normalized[(normalized.LastIndexOf('.') + 1)..];
        return ReservedTopLevelDomains.Contains(topLevel)
            || ReservedSecondLevelDomains.Any(reserved =>
                normalized == reserved || normalized.EndsWith("." + reserved, StringComparison.Ordinal));
    }
}
