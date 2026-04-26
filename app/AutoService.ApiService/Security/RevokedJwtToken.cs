using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AutoService.ApiService.Security;

/**
 * Persisted denylist entry for revoked access-token JWT IDs.
 */
public sealed class RevokedJwtToken
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; private set; }

    [MaxLength(64)]
    public string JwtId { get; private set; } = string.Empty;

    public DateTime RevokedAtUtc { get; private set; }

    public DateTime ExpiresAtUtc { get; private set; }

    private RevokedJwtToken() { }

    public RevokedJwtToken(string jwtId, DateTime revokedAtUtc, DateTime expiresAtUtc)
    {
        JwtId = jwtId;
        RevokedAtUtc = revokedAtUtc;
        ExpiresAtUtc = expiresAtUtc;
    }

    public void ExtendExpiry(DateTime expiresAtUtc)
    {
        if (expiresAtUtc > ExpiresAtUtc)
        {
            ExpiresAtUtc = expiresAtUtc;
        }
    }
}