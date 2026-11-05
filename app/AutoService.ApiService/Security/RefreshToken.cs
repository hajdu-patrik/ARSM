using AutoService.ApiService.Domain;

namespace AutoService.ApiService.Security;

/** Persisted refresh token session for cookie-based authentication. Only hashed token values are stored. */
public sealed class RefreshToken
{
    /** Column length of CreatedByUserAgent; a longer client header is cut to fit instead of failing the save. */
    public const int MaxUserAgentLength = 512;

    public int Id { get; private set; }

    public int MechanicId { get; private set; }

    public Mechanic Mechanic { get; private set; } = null!;

    public string TokenHash { get; private set; } = string.Empty;

    public DateTime CreatedAtUtc { get; private set; }

    public DateTime ExpiresAtUtc { get; private set; }

    public DateTime? RevokedAtUtc { get; private set; }

    public string? ReplacedByTokenHash { get; private set; }

    public string? CreatedByIpAddress { get; private set; }

    public string? CreatedByUserAgent { get; private set; }

    private RefreshToken() { }

    public RefreshToken(
        int mechanicId,
        string tokenHash,
        DateTime createdAtUtc,
        DateTime expiresAtUtc,
        string? createdByIpAddress,
        string? createdByUserAgent)
    {
        MechanicId = mechanicId;
        TokenHash = tokenHash;
        CreatedAtUtc = createdAtUtc;
        ExpiresAtUtc = expiresAtUtc;
        CreatedByIpAddress = createdByIpAddress;
        CreatedByUserAgent = TruncateUserAgent(createdByUserAgent);
    }

    /** Cuts to the column length without leaving half of a surrogate pair, which Npgsql would refuse to encode. */
    private static string? TruncateUserAgent(string? userAgent)
    {
        if (userAgent is not { Length: > MaxUserAgentLength })
        {
            return userAgent;
        }

        var length = char.IsHighSurrogate(userAgent[MaxUserAgentLength - 1]) ? MaxUserAgentLength - 1 : MaxUserAgentLength;
        return userAgent[..length];
    }

    public void Revoke(DateTime revokedAtUtc, string? replacedByTokenHash = null)
    {
        RevokedAtUtc = revokedAtUtc;
        ReplacedByTokenHash = replacedByTokenHash;
    }
}
