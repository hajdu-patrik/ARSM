namespace AutoService.ApiService.Security;

/** Privacy-preserving client identifier for logs and refresh-token binding: raw IPs never leave the process. */
internal static class ClientIpAddress
{
    /** A short SHA-256 fingerprint of the caller's address, or null when the connection carries none. */
    internal static string? Hash(HttpContext httpContext)
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString();
        return string.IsNullOrWhiteSpace(ip) ? null : $"sha256:{TokenSecurity.HashSha256(ip)[..12]}";
    }
}
