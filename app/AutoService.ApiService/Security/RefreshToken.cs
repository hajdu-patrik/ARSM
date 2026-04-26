using AutoService.ApiService.Domain;
namespace AutoService.ApiService.Security;

/**
 * Persisted refresh token session for cookie-based authentication.
 * Only hashed token values are stored.
 */
public sealed class RefreshToken
{
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
        CreatedByUserAgent = createdByUserAgent;
    }

    public bool IsActive(DateTime nowUtc)
        => RevokedAtUtc is null && ExpiresAtUtc > nowUtc;

    public void Revoke(DateTime revokedAtUtc, string? replacedByTokenHash = null)
    {
        RevokedAtUtc = revokedAtUtc;
        ReplacedByTokenHash = replacedByTokenHash;
    }
}
