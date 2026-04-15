/**
 * RefreshToken.cs
 *
 * Auto-generated documentation header for this source file.
 */

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

    /**
     * RefreshToken operation.
     *
     * @param mechanicId Parameter.
     * @param tokenHash Parameter.
     * @param createdAtUtc Parameter.
     * @param expiresAtUtc Parameter.
     * @param createdByIpAddress Parameter.
     * @param createdByUserAgent Parameter.
     */
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

    /**
     * IsActive operation.
     *
     * @param nowUtc Parameter.
     * @returns Return value.
     */
    public bool IsActive(DateTime nowUtc)
        => RevokedAtUtc is null && ExpiresAtUtc > nowUtc;

    /**
     * Revoke operation.
     *
     * @param revokedAtUtc Parameter.
     * @param replacedByTokenHash Parameter.
     */
    public void Revoke(DateTime revokedAtUtc, string? replacedByTokenHash = null)
    {
        RevokedAtUtc = revokedAtUtc;
        ReplacedByTokenHash = replacedByTokenHash;
    }
}
